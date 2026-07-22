const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);

if (process.env.NODE_ENV === 'test') {
  const testRoutes = require('./routes/testRoutes');
  app.use('/api/test', testRoutes);
}

module.exports = app;
