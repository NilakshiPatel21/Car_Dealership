const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);

if (process.env.NODE_ENV === 'test') {
  const testRoutes = require('../tests/testRoutes');
  app.use('/api/test', testRoutes);
}

module.exports = app;
