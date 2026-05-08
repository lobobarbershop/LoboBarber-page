const connectDB = require('../../../_lib/mongodb');
const Appointment = require('../../../_lib/models');
const setCors = require('../../../_lib/cors');
const adminAuth = require('../../../_lib/auth');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();
  if (!adminAuth(req, res)) return;

  try {
    await connectDB();
    const appt = await Appointment.findOne({ code: req.query.code.toUpperCase() });
    if (!appt) return res.status(404).json({ error: 'Código no encontrado' });
    if (appt.status === 'cancelled') return res.status(400).json({ error: 'Ya estaba cancelada' });
    appt.status = 'cancelled';
    await appt.save();
    res.json({ success: true, message: 'Cita cancelada por administrador' });
  } catch (err) {
    res.status(500).json({ error: 'Error al cancelar' });
  }
};
