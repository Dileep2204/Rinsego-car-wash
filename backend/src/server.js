const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'RinseGo API', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`RinseGo Backend API running on port ${PORT}`);
});
