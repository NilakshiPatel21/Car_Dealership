const express = require('express');
const { protect, adminOnly } = require('../middleware/auth');
 
// These routes exist purely so middleware.auth.test.js can exercise
// protect/adminOnly through real HTTP requests. They are only mounted
// when NODE_ENV === 'test' (see app.js) and never exposed in production.
const router = express.Router();
 
router.get('/protected', protect, (req, res) => {
  res.status(200).json({ message: 'Success', user: req.user });
});
 
router.get('/admin', protect, adminOnly, (req, res) => {
  res.status(200).json({ message: 'Admin Access Granted', user: req.user });
});
 
module.exports = router;