const setCors = require('./_lib/cors');
const { SERVICES } = require('./_lib/helpers');

module.exports = (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();
  res.json(SERVICES);
};
