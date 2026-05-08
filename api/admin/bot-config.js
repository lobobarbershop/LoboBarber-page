const connectDB = require('../_lib/mongodb');
const { BotConfig } = require('../_lib/models');
const setCors = require('../_lib/cors');
const adminAuth = require('../_lib/auth');

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

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!adminAuth(req, res)) return;

  await connectDB();

  if (req.method === 'GET') {
    const config = await BotConfig.findOne().sort({ updatedAt: -1 });
    return res.json({ systemPrompt: config ? config.systemPrompt : DEFAULT_PROMPT });
  }

  if (req.method === 'PUT') {
    const { systemPrompt } = req.body;
    if (!systemPrompt) return res.status(400).json({ error: 'systemPrompt es requerido' });
    await BotConfig.findOneAndUpdate({}, { systemPrompt, updatedAt: new Date() }, { upsert: true, new: true });
    return res.json({ success: true });
  }

  res.status(405).end();
};
