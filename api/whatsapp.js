const connectDB = require('./_lib/mongodb');
const { BotConfig, Appointment, WaMessage, WaConversation } = require('./_lib/models');

const DEFAULT_PROMPT = `Eres el asistente virtual de Lobo Barber Shop, una barbería en Costa Rica. Respondes consultas de clientes por WhatsApp de manera amigable, concisa y profesional.

Información del negocio:
- Horario: Lunes a Sábado, 9:00 AM a 6:30 PM
- Domingos: cerrado
- Barberos: Lobo y Cachetes

Servicios y precios:
- Corte de Cabello: ₡8.000 (30 min)
- Arreglo de Barba: ₡5.000 (30 min)
- Corte + Barba: ₡12.000 (60 min)
- Afeitado a Navaja: ₡6.000 (45 min)
- Corte Niño: ₡5.000 (30 min)

Para agendar una cita visita nuestro sitio web. Para consultar o modificar una cita existente necesitas tu código de cita.

Responde siempre en español. Sé breve y amigable. Si te preguntan algo que no sabes, indica que pueden comunicarse directamente con la barbería.`;

async function sendMetaMessage(phoneNumberId, to, body) {
  const res = await fetch(
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
        text: { body },
      }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Meta API error: ${err}`);
  }
  return res.json();
}

module.exports = async (req, res) => {
  // GET — verificación del webhook por Meta
  if (req.method === 'GET') {
    const mode      = req.query['hub.mode'];
    const token     = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).end();
  }

  if (req.method !== 'POST') return res.status(405).end();

  // Confirmar recepción inmediatamente (Meta requiere respuesta < 5s)
  res.status(200).json({ status: 'ok' });

  try {
    const body = req.body;
    if (body?.object !== 'whatsapp_business_account') return;

    const value = body?.entry?.[0]?.changes?.[0]?.value;
    if (!value?.messages?.[0]) return;

    const message = value.messages[0];
    if (message.type !== 'text') return; // solo texto por ahora

    const userMessage   = message.text?.body || '';
    const from          = message.from;              // sin "+" ej: "50688881234"
    const cleanPhone    = `+${from}`;
    const phoneNumberId = value.metadata?.phone_number_id;
    const customerName  = value.contacts?.[0]?.profile?.name || '';

    if (!userMessage.trim()) return;

    await connectDB();

    await WaMessage.create({ phone: cleanPhone, body: userMessage, direction: 'inbound', read: false });

    const config = await BotConfig.findOne().sort({ updatedAt: -1 });
    const systemPrompt = config ? config.systemPrompt : DEFAULT_PROMPT;

    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const aiMsg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });
    const reply = aiMsg.content[0].text;

    await sendMetaMessage(phoneNumberId, from, reply);

    await WaMessage.create({ phone: cleanPhone, body: reply, direction: 'outbound', read: true });

    // Buscar nombre si hay citas previas con ese número
    const digits = from.slice(-8);
    const appt = await Appointment.findOne({ clientPhone: { $regex: digits } }).sort({ createdAt: -1 });
    const name = customerName || appt?.clientName || '';

    const updateFields = {
      lastMessage: userMessage.slice(0, 100),
      lastMessageAt: new Date(),
      lastDirection: 'inbound',
      $inc: { unreadCount: 1 },
    };
    if (name) updateFields.customerName = name;

    await WaConversation.findOneAndUpdate(
      { phone: cleanPhone },
      updateFields,
      { upsert: true, new: true }
    );
  } catch (err) {
    console.error('WhatsApp webhook error:', err);
  }
};
