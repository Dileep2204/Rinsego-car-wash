const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');

const router = express.Router();
const otpStore = new Map();

router.post('/login-step1', async (req, res) => {
  try {
    const { phone, password, role } = req.body;
    if (!phone || String(phone).includes('@')) {
      return res.status(400).json({ error: 'Email ID is not allowed for login. Please enter your 10-digit phone number.' });
    }
    if (!/^\d{10}$/.test(String(phone).trim())) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit phone number.' });
    }

    const result = await db.query('SELECT * FROM users WHERE phone = $1 AND role = $2', [phone.trim(), role]);
    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ error: `No ${role} account found for phone ${phone}. Please Sign Up first.` });
    }

    let isMatch = false;
    if (user.password_hash.startsWith('$2')) {
      isMatch = await bcrypt.compare(password, user.password_hash);
    } else {
      isMatch = password === user.password_hash;
    }

    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect password for this phone number.' });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    otpStore.set(phone.trim(), { otp, role, expiresAt: Date.now() + 5 * 60 * 1000 });

    res.json({
      message: `SMS Verification Code sent to +91 ${phone}`,
      demoOtp: otp,
      phone: user.phone,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during login verification' });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp, role } = req.body;
    const record = otpStore.get(String(phone).trim());
    if (!record || record.role !== role || Date.now() > record.expiresAt) {
      return res.status(400).json({ error: 'Verification code expired or invalid. Please request a new code.' });
    }
    if (String(otp).trim() !== record.otp) {
      return res.status(400).json({ error: 'Invalid verification code. Please check the 6-digit SMS code.' });
    }

    otpStore.delete(String(phone).trim());

    const result = await db.query(
      'SELECT id, role, name, phone, email, address, zone, worker_code FROM users WHERE phone = $1 AND role = $2',
      [phone.trim(), role]
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, phone: user.phone, role: user.role, name: user.name }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error verifying OTP' });
  }
});

router.post('/signup', async (req, res) => {
  try {
    const { name, phone, email, address, car, plate, password } = req.body;
    if (!/^\d{10}$/.test(String(phone).trim())) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit phone number.' });
    }

    const existing = await db.query('SELECT id FROM users WHERE phone = $1', [phone.trim()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'This phone number is already registered. Please Login instead.' });
    }

    const hash = await bcrypt.hash(password, 10);
    const insertUser = await db.query(
      `INSERT INTO users (role, name, phone, email, password_hash, address)
       VALUES ('customer', $1, $2, $3, $4, $5)
       RETURNING id, role, name, phone, email, address`,
      [name.trim(), phone.trim(), email.trim(), hash, address.trim()]
    );
    const user = insertUser.rows[0];

    if (car && plate) {
      await db.query(
        'INSERT INTO vehicles (user_phone, reg, model, type, color) VALUES ($1, $2, $3, $4, $5)',
        [user.phone, plate.trim().toUpperCase(), car.trim(), 'Sedan', 'Silver']
      );
    }

    const token = jwt.sign({ id: user.id, phone: user.phone, role: user.role, name: user.name }, JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create customer account' });
  }
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  const found = await db.query('SELECT phone, name FROM users WHERE email = $1', [String(email).trim()]);
  if (found.rows.length === 0) {
    return res.status(404).json({ error: 'No account associated with this backup email address.' });
  }
  res.json({ message: `Password recovery link sent to backup email: ${email}` });
});

router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, email, address } = req.body;
    const result = await db.query(
      'UPDATE users SET name = $1, email = $2, address = $3 WHERE phone = $4 RETURNING id, role, name, phone, email, address',
      [name, email, address, req.user.phone]
    );
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
