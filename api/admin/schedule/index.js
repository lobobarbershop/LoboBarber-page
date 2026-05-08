const connectDB = require('../../_lib/mongodb');
const { BarberException } = require('../../_lib/models');
const setCors = require('../../_lib/cors');
const adminAuth = require('../../_lib/auth');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!adminAuth(req, res)) return;

  await connectDB();

  if (req.method === 'GET') {
    const filter = {};
    if (req.query.barberId) filter.barberId = parseInt(req.query.barberId);
    if (req.query.upcoming === 'true') {
      filter.date = { $gte: new Date().toISOString().split('T')[0] };
    }
    const exceptions = await BarberException.find(filter).sort({ date: 1 });
    return res.json({ exceptions });
  }

  if (req.method === 'POST') {
    const { barberId, date, type, startTime, endTime, note } = req.body;
    if (!barberId || !date || !type) return res.status(400).json({ error: 'Faltan campos requeridos' });

    const exists = await BarberException.findOne({ barberId: parseInt(barberId), date });
    if (exists) return res.status(409).json({ error: 'Ya existe una excepción para ese barbero y fecha' });

    const exc = new BarberException({ barberId: parseInt(barberId), date, type, startTime, endTime, note });
    await exc.save();
    return res.status(201).json({ success: true, exception: exc });
  }

  res.status(405).end();
};
