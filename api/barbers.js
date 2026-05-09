const connectDB = require('./_lib/mongodb');
const { BarberModel } = require('./_lib/models');
const setCors = require('./_lib/cors');
const { DEFAULT_BARBERS_SEED } = require('./_lib/helpers');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();

  await connectDB();
  let barbers = await BarberModel.find({ active: true }).sort({ order: 1 });

  if (!barbers.length) {
    await BarberModel.insertMany(DEFAULT_BARBERS_SEED);
    barbers = await BarberModel.find({ active: true }).sort({ order: 1 });
  }

  res.json(barbers.map(b => ({
    barberId: b.barberId,
    name:     b.name,
    title:    b.title,
    emoji:    b.emoji,
  })));
};
