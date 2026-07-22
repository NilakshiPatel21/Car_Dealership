const Vehicle = require('../models/Vehicle');

function toVehicleDTO(vehicle) {
  return {
    id: vehicle._id,
    make: vehicle.make,
    model: vehicle.model,
    category: vehicle.category,
    price: vehicle.price,
    quantity: vehicle.quantity,
  };
}

/**
 * POST /api/vehicles
 * Creates a new vehicle listing. Requires authentication (any logged-in
 * user), per the kata spec — only DELETE and restock are admin-only.
 */
async function createVehicle(req, res) {
  const { make, model, category, price, quantity } = req.body;

  if (!make || !model || !category || price === undefined || quantity === undefined) {
    return res.status(400).json({
      message: 'make, model, category, price and quantity are all required',
    });
  }

  if (price < 0 || quantity < 0) {
    return res.status(400).json({ message: 'price and quantity cannot be negative' });
  }

  const vehicle = await Vehicle.create({ make, model, category, price, quantity });

  return res.status(201).json({ vehicle: toVehicleDTO(vehicle) });
}

module.exports = { createVehicle, toVehicleDTO };