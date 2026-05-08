const connectDB = require('../_lib/mongodb');
const { BarberSettings } = require('../_lib/models');
const setCors = require('../_lib/cors');
const adminAuth = require('../_lib/auth');

const DEFAULTS = {
  1: { id: 1, name: 'Lobo',     slotInterval: 30, startTime: '09:00', endTime: '18:30' },
  2: { id: 2, name: 'Cachetes', slotInterval: 30, startTime: '09:00', endTime: '18:30' },
};

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!adminAuth(req, res)) return;

  await connectDB();

  if (req.method === 'GET') {
    const [s1, s2] = await Promise.all([
      BarberSettings.findOne({ barberId: 1 }),
      BarberSettings.findOne({ barberId: 2 }),
    ]);
    const barbers = [1, 2].map(id => {
      const s = id === 1 ? s1 : s2;
      return s
        ? { id, name: DEFAULTS[id].name, slotInterval: s.slotInterval, startTime: s.startTime, endTime: s.endTime }
        : { ...DEFAULTS[id] };
    });
    return res.json({ barbers });
  }

  if (req.method === 'PUT') {
    const { barberId, slotInterval, startTime, endTime } = req.body;
    if (!barberId) return res.status(400).json({ error: 'barberId es requerido' });
    const update = {};
    if (slotInterval) update.slotInterval = parseInt(slotInterval);
    if (startTime)    update.startTime = startTime;
    if (endTime)      update.endTime = endTime;
    await BarberSettings.findOneAndUpdate(
      { barberId: parseInt(barberId) },
      update,
      { upsert: true, new: true }
    );
    return res.json({ success: true });
  }

  res.status(405).end();
};
