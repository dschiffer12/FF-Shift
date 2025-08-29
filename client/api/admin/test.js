const { setCORSHeaders, handlePreflight } = require('../../utils/db');

module.exports = async (req, res) => {
  setCORSHeaders(res);
  
  if (handlePreflight(req, res)) return;

  res.json({
    message: 'Admin test endpoint is working',
    method: req.method,
    url: req.url,
    path: req.path,
    timestamp: new Date().toISOString()
  });
};
