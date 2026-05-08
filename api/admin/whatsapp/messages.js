const connectDB = require('../../_lib/mongodb');
const { WaMessage, WaConversation } = require('../../_lib/models');
const setCors = require('../../_lib/cors');
const adminAuth = require('../../_lib/auth');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();
  if (!adminAuth(req, res)) return;

  const { phone } = req.query;
  if (!phone) return res.status(400).json({ error: 'phone requerido' });

  await connectDB();
  const messages = await WaMessage.find({ phone })
    .sort({ createdAt: 1 })
    .limit(100);

  const conv = await WaConversation.findOne({ phone });

  res.json({ messages, customerName: conv?.customerName || '' });
};
