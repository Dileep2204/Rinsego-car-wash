const express = require('express');
const multer = require('multer');
const path = require('path');
const db = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, unique + path.extname(file.originalname || '.jpg'));
  },
});
const upload = multer({ storage });

router.get('/plans', async (req, res) => {
  const result = await db.query('SELECT * FROM plans ORDER BY price ASC');
  res.json(result.rows);
});

router.get('/customer/workspace', authenticateToken, async (req, res) => {
  const phone = req.user.phone;
  const [subRes, vehRes, bookRes] = await Promise.all([
    db.query('SELECT * FROM subscriptions WHERE user_phone = $1', [phone]),
    db.query('SELECT * FROM vehicles WHERE user_phone = $1 ORDER BY id DESC', [phone]),
    db.query('SELECT * FROM bookings WHERE customer_phone = $1 ORDER BY id DESC', [phone]),
  ]);

  res.json({
    subscription: subRes.rows[0] || null,
    vehicles: vehRes.rows,
    bookings: bookRes.rows,
  });
});

router.post('/customer/vehicles', authenticateToken, async (req, res) => {
  const { reg, model, type, color } = req.body;
  const result = await db.query(
    'INSERT INTO vehicles (user_phone, reg, model, type, color) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [req.user.phone, reg.toUpperCase(), model, type, color]
  );
  res.status(201).json(result.rows[0]);
});

router.delete('/customer/vehicles/:id', authenticateToken, async (req, res) => {
  await db.query('DELETE FROM vehicles WHERE id = $1 AND user_phone = $2', [req.params.id, req.user.phone]);
  res.json({ deleted: true });
});

router.post('/customer/subscribe', authenticateToken, async (req, res) => {
  const { planId, method } = req.body;
  const phone = req.user.phone;

  const planRes = await db.query('SELECT * FROM plans WHERE id = $1', [planId]);
  const plan = planRes.rows[0];
  if (!plan) return res.status(404).json({ error: 'Plan not found' });

  const existingSub = await db.query('SELECT * FROM subscriptions WHERE user_phone = $1', [phone]);
  const prevRem = existingSub.rows[0] ? existingSub.rows[0].remaining : 0;
  const prevTot = existingSub.rows[0] ? existingSub.rows[0].total : 0;

  const newRem = prevRem + plan.washes;
  const newTot = prevTot + plan.washes;
  const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const subRes = await db.query(
    `INSERT INTO subscriptions (user_phone, plan_id, plan_name, expiry, remaining, total)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_phone) DO UPDATE SET
       plan_id = EXCLUDED.plan_id,
       plan_name = EXCLUDED.plan_name,
       expiry = EXCLUDED.expiry,
       remaining = EXCLUDED.remaining,
       total = EXCLUDED.total,
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [phone, plan.id, plan.name, expiry, newRem, newTot]
  );

  const txnId = 'TXN-' + Math.floor(10000 + Math.random() * 89999);
  const today = new Date().toISOString().split('T')[0];

  const payRes = await db.query(
    `INSERT INTO payments (id, customer_name, customer_phone, plan_name, amount, method, status, payment_date)
     VALUES ($1, $2, $3, $4, $5, $6, 'Confirmed', $7) RETURNING *`,
    [txnId, req.user.name, phone, plan.name, plan.price, method, today]
  );

  res.status(201).json({ subscription: subRes.rows[0], payment: payRes.rows[0] });
});

router.post('/customer/bookings', authenticateToken, async (req, res) => {
  const { vehicle, service, date, slot, address, instructions } = req.body;
  const phone = req.user.phone;

  const bookRes = await db.query(
    `INSERT INTO bookings (customer_name, customer_phone, vehicle, service, booking_date, slot, address, instructions, worker_name, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Vikram Rao', 'Pending') RETURNING *`,
    [req.user.name, phone, vehicle, service, date, slot, address, instructions || 'None']
  );

  await db.query(
    'UPDATE subscriptions SET remaining = GREATEST(remaining - 1, 0) WHERE user_phone = $1',
    [phone]
  );

  res.status(201).json(bookRes.rows[0]);
});

router.patch('/customer/bookings/:id/cancel', authenticateToken, async (req, res) => {
  const phone = req.user.phone;
  const upd = await db.query(
    `UPDATE bookings SET status = 'Cancelled' WHERE id = $1 AND customer_phone = $2 RETURNING *`,
    [req.params.id, phone]
  );
  if (upd.rows.length > 0) {
    await db.query('UPDATE subscriptions SET remaining = remaining + 1 WHERE user_phone = $1', [phone]);
  }
  res.json(upd.rows[0]);
});

router.get('/bookings', authenticateToken, authorizeRoles('worker', 'admin'), async (req, res) => {
  const result = await db.query('SELECT * FROM bookings ORDER BY id DESC');
  res.json(result.rows);
});

router.patch('/worker/bookings/:id/status', authenticateToken, authorizeRoles('worker', 'admin'), async (req, res) => {
  const { status } = req.body;
  const check = await db.query('SELECT * FROM bookings WHERE id = $1', [req.params.id]);
  const booking = check.rows[0];
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  if (status === 'Completed' && (!booking.before_photos?.length || !booking.after_photos?.length)) {
    return res.status(400).json({ error: 'Upload at least one Before and After photo first!' });
  }

  const upd = await db.query('UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *', [status, req.params.id]);
  res.json(upd.rows[0]);
});

router.post('/worker/bookings/:id/photos', authenticateToken, authorizeRoles('worker', 'admin'), upload.array('photos', 6), async (req, res) => {
  const stage = req.body.stage === 'after' ? 'after_photos' : 'before_photos';
  const urls = (req.files || []).map((f) => `/uploads/${f.filename}`);

  const existing = await db.query('SELECT before_photos, after_photos FROM bookings WHERE id = $1', [req.params.id]);
  if (!existing.rows[0]) return res.status(404).json({ error: 'Booking not found' });

  const currentArr = existing.rows[0][stage] || [];
  const updatedArr = [...currentArr, ...urls];

  const upd = await db.query(`UPDATE bookings SET ${stage} = $1::jsonb WHERE id = $2 RETURNING *`, [
    JSON.stringify(updatedArr),
    req.params.id,
  ]);
  res.json(upd.rows[0]);
});

router.get('/admin/overview', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const [custs, workers, bookings, plans, payments, subs] = await Promise.all([
    db.query("SELECT id, name, phone, email, address FROM users WHERE role = 'customer' ORDER BY id DESC"),
    db.query("SELECT id, worker_code, name, phone, email, zone, completed_jobs, active FROM users WHERE role = 'worker' ORDER BY id ASC"),
    db.query('SELECT * FROM bookings ORDER BY id DESC'),
    db.query('SELECT * FROM plans ORDER BY price ASC'),
    db.query('SELECT * FROM payments ORDER BY created_at DESC'),
    db.query('SELECT COUNT(*)::int AS count FROM subscriptions'),
  ]);

  res.json({
    customers: custs.rows,
    workers: workers.rows,
    bookings: bookings.rows,
    plans: plans.rows,
    payments: payments.rows,
    activeSubscriptions: subs.rows[0].count,
  });
});

router.patch('/admin/bookings/:id/assign', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { workerName } = req.body;
  const upd = await db.query(
    `UPDATE bookings SET worker_name = $1, status = 'Assigned' WHERE id = $2 RETURNING *`,
    [workerName, req.params.id]
  );
  res.json(upd.rows[0]);
});

router.post('/admin/workers', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { name, phone, email, zone } = req.body;
  const countRes = await db.query("SELECT COUNT(*)::int AS cnt FROM users WHERE role = 'worker'");
  const code = 'RG-WRK-00' + (countRes.rows[0].cnt + 1);

  const ins = await db.query(
    `INSERT INTO users (role, name, phone, email, password_hash, zone, worker_code, completed_jobs)
     VALUES ('worker', $1, $2, $3, 'Worker@123', $4, $5, 0)
     RETURNING id, worker_code, name, phone, email, zone, completed_jobs, active`,
    [name, phone, email, zone, code]
  );
  res.status(201).json(ins.rows[0]);
});

router.patch('/admin/plans/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { price } = req.body;
  const upd = await db.query('UPDATE plans SET price = $1 WHERE id = $2 RETURNING *', [Number(price), req.params.id]);
  res.json(upd.rows[0]);
});

module.exports = router;
