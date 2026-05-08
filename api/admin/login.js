const setCors = require('../_lib/cors');

module.exports = (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { password } = req.body;
  if (!password || password !== process.env.ADMIN_PASSWORD)
    return res.status(401).json({ error: 'Contraseña incorrecta' });

  res.json({ token: process.env.ADMIN_PASSWORD });
};
