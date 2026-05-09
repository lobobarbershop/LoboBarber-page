const connectDB = require('./_lib/mongodb');
const { ServiceModel } = require('./_lib/models');
const setCors = require('./_lib/cors');
const { DEFAULT_SERVICES_SEED, formatPrice } = require('./_lib/helpers');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();

  await connectDB();
  let services = await ServiceModel.find({ active: true }).sort({ order: 1 });

  if (!services.length) {
    await ServiceModel.insertMany(DEFAULT_SERVICES_SEED);
    services = await ServiceModel.find({ active: true }).sort({ order: 1 });
  }

  res.json(services.map(s => ({
    slug:     s.slug,
    name:     s.name,
    duration: s.duration,
    price:    formatPrice(s.price),
    priceNum: s.price,
    icon:     s.icon,
  })));
};
