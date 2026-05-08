const connectDB = require('./_lib/mongodb');
const { Appointment, BarberSettings, BarberException } = require('./_lib/models');
const setCors = require('./_lib/cors');
const { SERVICE_DURATIONS, generateSlotsCustom, toMinutes, barberWorksOnDay } = require('./_lib/helpers');

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

    // Obtener settings del barbero (o usar defaults)
    const settingsDoc = await BarberSettings.findOne({ barberId: id });
    const settings = settingsDoc
      ? { slotInterval: settingsDoc.slotInterval, startTime: settingsDoc.startTime, endTime: settingsDoc.endTime }
      : { slotInterval: 30, startTime: '09:00', endTime: '18:30' };

    // Verificar excepción para esa fecha
    const exception = await BarberException.findOne({ barberId: id, date });
    if (exception) {
      if (exception.type === 'day_off') return res.json({ available: [], worksToday: false });
      if (exception.type === 'custom_hours') {
        if (exception.startTime) settings.startTime = exception.startTime;
        if (exception.endTime)   settings.endTime   = exception.endTime;
      }
    }

    const duration = SERVICE_DURATIONS[service] || 30;
    const CLOSING  = toMinutes(settings.endTime);

    const booked = await Appointment.find({ barberId: id, date, status: 'confirmed' })
      .select('time service').lean();

    const available = generateSlotsCustom(settings.startTime, settings.endTime, settings.slotInterval).filter(slotTime => {
      const slotStart = toMinutes(slotTime);
      const slotEnd   = slotStart + duration;
      if (slotEnd > CLOSING) return false;
      return !booked.some(appt => {
        const apptStart = toMinutes(appt.time);
        const apptEnd   = apptStart + (SERVICE_DURATIONS[appt.service] || 30);
        return slotStart < apptEnd && apptStart < slotEnd;
      });
    });

    res.json({ available, worksToday: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
