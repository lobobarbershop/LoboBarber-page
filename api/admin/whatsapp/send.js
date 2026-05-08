const connectDB = require('../../_lib/mongodb');
const { WaMessage, WaConversation } = require('../../_lib/models');
const setCors = require('../../_lib/cors');
const adminAuth = require('../../_lib/auth');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();
  if (!adminAuth(req, res)) return;

  const { phone, message } = req.body;
  if (!phone || !message) return res.status(400).json({ error: 'phone y message son requeridos' });

  try {
    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const msg = await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to:   `whatsapp:${phone}`,
      body: message,
    });

    await connectDB();

    await WaMessage.create({ phone, body: message, direction: 'outbound', read: true });

    await WaConversation.findOneAndUpdate(
      { phone },
      { lastMessage: message.slice(0, 100), lastMessageAt: new Date(), lastDirection: 'outbound' },
      { upsert: true, new: true }
    );

    res.json({ success: true, sid: msg.sid });
  } catch (err) {
    console.error('Twilio send error:', err);
    res.status(500).json({ error: 'No se pudo enviar el mensaje: ' + err.message });
  }
};
