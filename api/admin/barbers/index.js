const connectDB = require('../../_lib/mongodb');
const { BarberModel } = require('../../_lib/models');
const setCors = require('../../_lib/cors');
const adminAuth = require('../../_lib/auth');
const { DEFAULT_BARBERS_SEED } = require('../../_lib/helpers');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!adminAuth(req, res)) return;

  await connectDB();

  if (req.method === 'GET') {
    let barbers = await BarberModel.find().sort({ order: 1 });
    if (!barbers.length) {
      await BarberModel.insertMany(DEFAULT_BARBERS_SEED);
      barbers = await BarberModel.find().sort({ order: 1 });
    }
    return res.json(barbers);
  }

  if (req.method === 'POST') {
    const { name, title, emoji } = req.body;
    if (!name) return res.status(400).json({ error: 'name es requerido' });

    const maxBarber = await BarberModel.findOne().sort({ barberId: -1 });
    const barberId  = (maxBarber?.barberId || 0) + 1;
    const maxOrder  = await BarberModel.findOne().sort({ order: -1 });

    const barber = await BarberModel.create({
      barberId,
      name,
      title: title || 'Maestro Barbero',
      emoji: emoji || '✂️',
      order: (maxOrder?.order || 0) + 1,
    });
    return res.status(201).json({ success: true, barber });
  }

  res.status(405).end();
};
