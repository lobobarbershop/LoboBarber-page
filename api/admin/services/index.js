const connectDB = require('../../_lib/mongodb');
const { ServiceModel } = require('../../_lib/models');
const setCors = require('../../_lib/cors');
const adminAuth = require('../../_lib/auth');
const { DEFAULT_SERVICES_SEED, formatPrice, slugify } = require('../../_lib/helpers');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!adminAuth(req, res)) return;

  await connectDB();

  if (req.method === 'GET') {
    let services = await ServiceModel.find().sort({ order: 1 });
    if (!services.length) {
      await ServiceModel.insertMany(DEFAULT_SERVICES_SEED);
      services = await ServiceModel.find().sort({ order: 1 });
    }
    return res.json(services.map(s => ({
      _id:      s._id,
      slug:     s.slug,
      name:     s.name,
      duration: s.duration,
      price:    formatPrice(s.price),
      priceNum: s.price,
      icon:     s.icon,
      active:   s.active,
      order:    s.order,
    })));
  }

  if (req.method === 'POST') {
    const { name, duration, price, icon } = req.body;
    if (!name || !duration || !price)
      return res.status(400).json({ error: 'name, duration y price son requeridos' });

    const slug = slugify(name);
    const exists = await ServiceModel.findOne({ slug });
    if (exists)
      return res.status(409).json({ error: 'Ya existe un servicio con ese nombre (slug duplicado)' });

    const maxOrder = await ServiceModel.findOne().sort({ order: -1 });
    const service = await ServiceModel.create({
      slug,
      name,
      duration: parseInt(duration),
      price:    parseInt(price),
      icon:     icon || '✂️',
      order:    (maxOrder?.order || 0) + 1,
    });
    return res.status(201).json({
      success: true,
      service: { ...service.toObject(), price: formatPrice(service.price), priceNum: service.price },
    });
  }

  res.status(405).end();
};
