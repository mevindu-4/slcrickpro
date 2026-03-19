const app = require('../server/index.js');

module.exports = (req, res) => {
  // Vercel routes this function under `/api/*`, but the Express app is defined at `/`.
  if (typeof req.url === 'string' && req.url.startsWith('/api')) {
    req.url = req.url.slice(4) || '/';
  }
  return app(req, res);
};

