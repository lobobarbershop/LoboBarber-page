const connectDB = require('./_lib/mongodb');
const Appointment = require('./_lib/models');
const setCors = require('./_lib/cors');
const { SERVICE_DURATIONS, generateSlots, toMinutes, barberWorksOnDay } = require('./_lib/helpers');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const { barberId, date, service } = req.query;
    if (!barberId || !date) return res.status(400).json({ error: 'Faltan parámetros' });

    const id = Number(barberId);
    if (!barberWorksOnDay(id, date)) return res.json({ available: [], worksToday: false });

    await connectDB();

    const duration = SERVICE_DURATIONS[service] || 30;
    const CLOSING = 18 * 60 + 30;

    const booked = await Appointment.find({ barberId: id, date, status: 'confirmed' })
      .select('time service').lean();

    const available = generateSlots().filter(slotTime => {
      const slotStart = toMinutes(slotTime);
      const slotEnd = slotStart + duration;
      if (slotEnd > CLOSING) return false;
      return !booked.some(appt => {
        const apptStart = toMinutes(appt.time);
        const apptEnd = apptStart + (SERVICE_DURATIONS[appt.service] || 30);
        return slotStart < apptEnd && apptStart < slotEnd;
      });
    });

    res.json({ available, worksToday: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
