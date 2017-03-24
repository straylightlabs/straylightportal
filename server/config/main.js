const PORT = process.env.PORTAL_PORT || 8081;

module.exports = {
  port: PORT,
  baseUrl: process.env.PORTAL_BASE_URL || 'http://localhost:' + PORT,
  serviceName: 'Straylight Connect',
  shortServiceName: 'Connect',
  fileUploadDir: process.env.PORTAL_UPLOAD_DIR || 'uploads/'
};

