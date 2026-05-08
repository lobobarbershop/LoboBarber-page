const connectDB = require('../../_lib/mongodb');
const { BarberException } = require('../../_lib/models');
const setCors = require('../../_lib/cors');
const adminAuth = require('../../_lib/auth');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'DELETE') return res.status(405).end();
  if (!adminAuth(req, res)) return;

  await connectDB();
  const result = await BarberException.findByIdAndDelete(req.query.id);
  if (!result) return res.status(404).json({ error: 'Excepción no encontrada' });
  res.json({ success: true });
};
