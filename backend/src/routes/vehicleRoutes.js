const express = require('express');
const { protect } = require('../middleware/auth');
const { createVehicle } = require('../controllers/vehicleController');

const router = express.Router();

router.post('/', protect, createVehicle);

module.exports = router;