CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    role VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'worker', 'admin')),
    name VARCHAR(120) NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    email VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    address TEXT DEFAULT '',
    zone VARCHAR(120) DEFAULT '',
    worker_code VARCHAR(30),
    completed_jobs INT DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS plans (
    id VARCHAR(30) PRIMARY KEY,
    name VARCHAR(80) NOT NULL,
    price INT NOT NULL,
    washes INT NOT NULL,
    tag VARCHAR(120) NOT NULL,
    popular BOOLEAN DEFAULT FALSE,
    features JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    user_phone VARCHAR(15) UNIQUE REFERENCES users(phone) ON DELETE CASCADE,
    plan_id VARCHAR(30) REFERENCES plans(id),
    plan_name VARCHAR(80) NOT NULL,
    expiry DATE NOT NULL,
    remaining INT NOT NULL,
    total INT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    user_phone VARCHAR(15) REFERENCES users(phone) ON DELETE CASCADE,
    reg VARCHAR(30) NOT NULL,
    model VARCHAR(100) NOT NULL,
    type VARCHAR(40) NOT NULL,
    color VARCHAR(40) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(120) NOT NULL,
    customer_phone VARCHAR(15) REFERENCES users(phone) ON DELETE CASCADE,
    vehicle VARCHAR(150) NOT NULL,
    service VARCHAR(150) NOT NULL,
    booking_date VARCHAR(20) NOT NULL,
    slot VARCHAR(60) NOT NULL,
    address TEXT NOT NULL,
    instructions TEXT DEFAULT 'None',
    worker_name VARCHAR(120) DEFAULT 'Vikram Rao',
    status VARCHAR(30) DEFAULT 'Pending',
    before_photos JSONB NOT NULL DEFAULT '[]'::jsonb,
    after_photos JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(40) PRIMARY KEY,
    customer_name VARCHAR(120) NOT NULL,
    customer_phone VARCHAR(15) REFERENCES users(phone) ON DELETE CASCADE,
    plan_name VARCHAR(80) NOT NULL,
    amount INT NOT NULL,
    method VARCHAR(60) NOT NULL,
    status VARCHAR(30) DEFAULT 'Confirmed',
    payment_date VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO plans (id, name, price, washes, tag, popular, features) VALUES
('basic', 'Basic', 499, 4, 'For everyday upkeep', FALSE, '["Basic exterior wash (4 / month)", "Scheduled service", "Standard support"]'::jsonb),
('standard', 'Standard', 899, 8, 'Our most popular plan', TRUE, '["Exterior wash + interior cleaning (8 / month)", "Priority booking", "Before & after photo updates"]'::jsonb),
('premium', 'Premium', 1499, 12, 'Complete car care', FALSE, '["Complete interior & exterior wash (12 / month)", "Premium wax & glass polish", "Priority service & support"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (role, name, phone, email, password_hash, address, zone, worker_code, completed_jobs) VALUES
('customer', 'Aarav Sharma', '9000000001', 'customer@rinsego.demo', 'Customer@123', 'Flat 302, Greenview Residency, MG Road, Vijayawada', '', NULL, 0),
('worker', 'Vikram Rao', '9000000002', 'worker@rinsego.demo', 'Worker@123', '', 'Benz Circle & MG Road', 'RG-WRK-001', 42),
('worker', 'Suresh Kumar', '9000000004', 'suresh@rinsego.demo', 'Worker@123', '', 'Gollapudi & Bhavanipuram', 'RG-WRK-002', 29),
('admin', 'RinseGo Admin', '9000000003', 'admin@rinsego.demo', 'Admin@123', '', '', NULL, 0)
ON CONFLICT (phone) DO NOTHING;

INSERT INTO subscriptions (user_phone, plan_id, plan_name, expiry, remaining, total) VALUES
('9000000001', 'standard', 'Standard', '2026-12-22', 7, 8)
ON CONFLICT (user_phone) DO NOTHING;

INSERT INTO vehicles (user_phone, reg, model, type, color) VALUES
('9000000001', 'AP16AB1234', 'Hyundai Creta SX', 'SUV', 'Pearl White'),
('9000000001', 'AP16CD5678', 'Maruti Swift ZXi', 'Hatchback', 'Midnight Blue');

INSERT INTO bookings (id, customer_name, customer_phone, vehicle, service, booking_date, slot, address, instructions, worker_name, status, before_photos, after_photos) VALUES
(101, 'Aarav Sharma', '9000000001', 'Hyundai Creta SX (AP16AB1234)', 'Standard Exterior + Interior Wash', '2026-11-22', 'Morning (8 AM – 11 AM)', 'Flat 302, Greenview Residency, MG Road, Vijayawada', 'Parked in Basement B1 Slot 14', 'Vikram Rao', 'Assigned', '["https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=400&q=80"]'::jsonb, '[]'::jsonb),
(100, 'Aarav Sharma', '9000000001', 'Maruti Swift ZXi (AP16CD5678)', 'Premium Deep Clean & Wax', '2026-11-15', 'Evening (5 PM – 8 PM)', 'Flat 302, Greenview Residency, MG Road, Vijayawada', 'Call on arrival', 'Vikram Rao', 'Completed', '["https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=400&q=80"]'::jsonb, '["https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=400&q=80"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

SELECT setval('bookings_id_seq', (SELECT COALESCE(MAX(id), 101) FROM bookings));

INSERT INTO payments (id, customer_name, customer_phone, plan_name, amount, method, status, payment_date) VALUES
('TXN-90841', 'Aarav Sharma', '9000000001', 'Standard', 899, 'Google Pay (GPay)', 'Confirmed', '2026-11-22')
ON CONFLICT (id) DO NOTHING;
