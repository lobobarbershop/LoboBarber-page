const connectDB = require('../../_lib/mongodb');
const Appointment = require('../../_lib/models');
const setCors = require('../../_lib/cors');
const adminAuth = require('../../_lib/auth');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();
  if (!adminAuth(req, res)) return;

  await connectDB();
  const appt = await Appointment.findOne({ code: req.query.code.toUpperCase() });
  if (!appt) return res.status(404).json({ error: 'Código no encontrado' });
  res.json(appt);
};
