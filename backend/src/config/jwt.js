const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRES_IN = '7d';

module.exports = { JWT_SECRET, JWT_EXPIRES_IN };