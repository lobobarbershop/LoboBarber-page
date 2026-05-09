const connectDB = require('../../_lib/mongodb');
const { ServiceModel } = require('../../_lib/models');
const setCors = require('../../_lib/cors');
const adminAuth = require('../../_lib/auth');
const { formatPrice } = require('../../_lib/helpers');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!adminAuth(req, res)) return;

  const { slug } = req.query;
  await connectDB();

  if (req.method === 'PUT') {
    const { name, duration, price, icon, active } = req.body;
    const update = {};
    if (name !== undefined)     update.name     = name;
    if (duration !== undefined) update.duration = parseInt(duration);
    if (price !== undefined)    update.price    = parseInt(price);
    if (icon !== undefined)     update.icon     = icon;
    if (active !== undefined)   update.active   = active;

    const service = await ServiceModel.findOneAndUpdate({ slug }, update, { new: true });
    if (!service) return res.status(404).json({ error: 'Servicio no encontrado' });
    return res.json({
      success: true,
      service: { ...service.toObject(), price: formatPrice(service.price), priceNum: service.price },
    });
  }

  if (req.method === 'DELETE') {
    const result = await ServiceModel.findOneAndDelete({ slug });
    if (!result) return res.status(404).json({ error: 'Servicio no encontrado' });
    return res.json({ success: true });
  }

  res.status(405).end();
};
