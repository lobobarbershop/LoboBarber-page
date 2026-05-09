const connectDB = require('../../_lib/mongodb');
const { BarberModel, Appointment } = require('../../_lib/models');
const setCors = require('../../_lib/cors');
const adminAuth = require('../../_lib/auth');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!adminAuth(req, res)) return;

  const barberId = parseInt(req.query.id);
  await connectDB();

  if (req.method === 'PUT') {
    const { name, title, emoji, active } = req.body;
    const update = {};
    if (name !== undefined)   update.name   = name;
    if (title !== undefined)  update.title  = title;
    if (emoji !== undefined)  update.emoji  = emoji;
    if (active !== undefined) update.active = active;

    const barber = await BarberModel.findOneAndUpdate({ barberId }, update, { new: true });
    if (!barber) return res.status(404).json({ error: 'Barbero no encontrado' });
    return res.json({ success: true, barber });
  }

  if (req.method === 'DELETE') {
    const appts = await Appointment.countDocuments({ barberId, status: 'confirmed' });
    if (appts > 0)
      return res.status(409).json({
        error: `Este barbero tiene ${appts} cita(s) confirmada(s). Cancélalas primero o desactívalo.`,
      });
    const result = await BarberModel.findOneAndDelete({ barberId });
    if (!result) return res.status(404).json({ error: 'Barbero no encontrado' });
    return res.json({ success: true });
  }

  res.status(405).end();
};
