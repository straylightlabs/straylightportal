const PORT = 8081;

module.exports = {
  port: PORT,
  baseUrl: process.env.PORTAL_BASE_URL || 'http://localhost:' + PORT
};

