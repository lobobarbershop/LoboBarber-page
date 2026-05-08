const connectDB = require('../../_lib/mongodb');
const { WaConversation } = require('../../_lib/models');
const setCors = require('../../_lib/cors');
const adminAuth = require('../../_lib/auth');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();
  if (!adminAuth(req, res)) return;

  await connectDB();
  const conversations = await WaConversation.find()
    .sort({ lastMessageAt: -1 })
    .limit(50);
  res.json({ conversations });
};
