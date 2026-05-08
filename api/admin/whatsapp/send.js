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
    const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
    const to = phone.replace('+', ''); // Meta espera número sin "+"

    const metaRes = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.META_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: message },
        }),
      }
    );

    if (!metaRes.ok) {
      const errData = await metaRes.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `Meta API error ${metaRes.status}`);
    }

    const data = await metaRes.json();

    await connectDB();
    await WaMessage.create({ phone, body: message, direction: 'outbound', read: true });
    await WaConversation.findOneAndUpdate(
      { phone },
      { lastMessage: message.slice(0, 100), lastMessageAt: new Date(), lastDirection: 'outbound' },
      { upsert: true, new: true }
    );

    res.json({ success: true, messageId: data.messages?.[0]?.id });
  } catch (err) {
    console.error('Meta send error:', err);
    res.status(500).json({ error: 'No se pudo enviar: ' + err.message });
  }
};
