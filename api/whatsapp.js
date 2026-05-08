const connectDB = require('./_lib/mongodb');
const { BotConfig } = require('./_lib/models');

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

function twimlResponse(message) {
  const safe = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${safe}</Message></Response>`;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Content-Type', 'text/xml');
    return res.status(405).send(twimlResponse('Método no permitido'));
  }

  // Twilio envía form-urlencoded; Vercel lo parsea automáticamente en req.body
  const userMessage = req.body?.Body || '';
  if (!userMessage.trim()) {
    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send(twimlResponse('Hola! Escríbenos tu consulta.'));
  }

  try {
    await connectDB();
    const config = await BotConfig.findOne().sort({ updatedAt: -1 });
    const systemPrompt = config ? config.systemPrompt : DEFAULT_PROMPT;

    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });
    const reply = msg.content[0].text;

    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send(twimlResponse(reply));
  } catch (err) {
    console.error('WhatsApp webhook error:', err);
    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send(twimlResponse('Disculpa, en este momento no puedo responder. Contáctanos directamente al negocio.'));
  }
};
