const connectDB = require('../_lib/mongodb');
const Appointment = require('../_lib/models');
const setCors = require('../_lib/cors');
const adminAuth = require('../_lib/auth');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();
  if (!adminAuth(req, res)) return;

  try {
    await connectDB();
    const todayStr = new Date().toISOString().split('T')[0];
    const in7Days = new Date();
    in7Days.setDate(in7Days.getDate() + 7);
    const in7Str = in7Days.toISOString().split('T')[0];

    const [today, confirmed, cancelled, upcoming] = await Promise.all([
      Appointment.countDocuments({ date: todayStr, status: 'confirmed' }),
      Appointment.countDocuments({ status: 'confirmed' }),
      Appointment.countDocuments({ status: 'cancelled' }),
      Appointment.countDocuments({ date: { $gte: todayStr, $lte: in7Str }, status: 'confirmed' }),
    ]);

    res.json({ today, confirmed, cancelled, upcoming });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
};
