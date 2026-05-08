const connectDB = require('../_lib/mongodb');
const Appointment = require('../_lib/models');
const setCors = require('../_lib/cors');
const { barberWorksOnDay } = require('../_lib/helpers');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const code = req.query.code.toUpperCase();
  await connectDB();

  // GET — obtener cita por código
  if (req.method === 'GET') {
    const appt = await Appointment.findOne({ code });
    if (!appt) return res.status(404).json({ error: 'Código no encontrado' });
    return res.json(appt);
  }

  // PUT — modificar cita
  if (req.method === 'PUT') {
    try {
      const appt = await Appointment.findOne({ code });
      if (!appt) return res.status(404).json({ error: 'Código no encontrado' });
      if (appt.status === 'cancelled') return res.status(400).json({ error: 'La cita ya fue cancelada' });

      const { barberId, service, date, time } = req.body;
      const newBarberId = barberId ? parseInt(barberId) : appt.barberId;
      const newDate = date || appt.date;
      const newTime = time || appt.time;

      if (!barberWorksOnDay(newBarberId, newDate))
        return res.status(400).json({ error: 'El barbero no trabaja ese día' });

      if (new Date(`${newDate}T${newTime}:00`) <= new Date())
        return res.status(400).json({ error: 'No puedes modificar a una fecha pasada' });

      const conflict = await Appointment.findOne({
        barberId: newBarberId, date: newDate, time: newTime,
        status: 'confirmed', _id: { $ne: appt._id },
      });
      if (conflict) return res.status(409).json({ error: 'Ese horario ya está ocupado' });

      appt.barberId = newBarberId;
      appt.service = service || appt.service;
      appt.date = newDate;
      appt.time = newTime;
      await appt.save();

      return res.json({ success: true, message: 'Cita modificada correctamente', appointment: appt });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // DELETE — cancelar cita (cliente: requiere 24h de anticipación)
  if (req.method === 'DELETE') {
    try {
      const appt = await Appointment.findOne({ code });
      if (!appt) return res.status(404).json({ error: 'Código no encontrado' });
      if (appt.status === 'cancelled') return res.status(400).json({ error: 'La cita ya fue cancelada' });

      const diffHours = (new Date(`${appt.date}T${appt.time}:00`) - new Date()) / 3600000;
      if (diffHours < 24)
        return res.status(400).json({ error: 'Solo puedes cancelar con al menos 24 horas de anticipación' });

      appt.status = 'cancelled';
      await appt.save();
      return res.json({ success: true, message: 'Cita cancelada correctamente' });
    } catch (err) {
      return res.status(500).json({ error: 'Error al cancelar la cita' });
    }
  }

  res.status(405).end();
};
