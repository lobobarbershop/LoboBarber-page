const connectDB = require('../../_lib/mongodb');
const { WaMessage, WaConversation } = require('../../_lib/models');
const setCors = require('../../_lib/cors');
const adminAuth = require('../../_lib/auth');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();
  if (!adminAuth(req, res)) return;

  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'phone requerido' });

  await connectDB();
  await WaMessage.updateMany({ phone, direction: 'inbound', read: false }, { read: true });
  await WaConversation.findOneAndUpdate({ phone }, { unreadCount: 0 });

  res.json({ success: true });
};
