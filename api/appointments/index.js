const connectDB = require('../_lib/mongodb');
const { Appointment } = require('../_lib/models');
const setCors = require('../_lib/cors');
const { generateCode, barberWorksOnDay } = require('../_lib/helpers');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { clientName, clientPhone, clientEmail, barberId, service, date, time } = req.body;
    if (!clientName || !clientPhone || !barberId || !service || !date || !time)
      return res.status(400).json({ error: 'Todos los campos son requeridos' });

    const id = parseInt(barberId);
    if (!barberWorksOnDay(id, date))
      return res.status(400).json({ error: 'El barbero no trabaja ese día' });

    const todayUTC = new Date().toISOString().split('T')[0];
    if (date < todayUTC)
      return res.status(400).json({ error: 'No puedes agendar en una fecha pasada' });

    await connectDB();

    const conflict = await Appointment.findOne({ barberId: id, date, time, status: 'confirmed' });
    if (conflict) return res.status(409).json({ error: 'Ese horario ya está ocupado' });

    let code, tries = 0;
    do { code = generateCode(); tries++; }
    while (await Appointment.findOne({ code }) && tries < 10);

    const appt = new Appointment({ code, clientName, clientPhone, clientEmail, barberId: id, service, date, time });
    await appt.save();

    res.status(201).json({
      success: true, code, message: 'Cita confirmada',
      appointment: { code, clientName, barberId: id, service, date, time },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
