require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const { customAlphabet } = require('nanoid');

const app = express();
const PORT = process.env.PORT || 3000;

const generateCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);

// ─── CORS — permite todos los orígenes ────────────────────────────────────
app.use(cors());

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── MongoDB ──────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Conectado a MongoDB Atlas'))
  .catch(err => console.error('❌ Error MongoDB:', err));

// ─── Schema ───────────────────────────────────────────────────────────────
const appointmentSchema = new mongoose.Schema({
  code:        { type: String, unique: true, required: true },
  clientName:  { type: String, required: true, trim: true },
  clientPhone: { type: String, required: true, trim: true },
  clientEmail: { type: String, trim: true },
  barberId:    { type: Number, required: true, enum: [1, 2] },
  service:     { type: String, required: true },
  date:        { type: String, required: true },  // YYYY-MM-DD
  time:        { type: String, required: true },  // HH:MM
  status:      { type: String, default: 'confirmed', enum: ['confirmed', 'cancelled'] },
  createdAt:   { type: Date, default: Date.now },
});

const Appointment = mongoose.model('Appointment', appointmentSchema);

// ─── Helpers ──────────────────────────────────────────────────────────────
const SERVICES = [
  { id: 'corte',  name: 'Corte de Cabello',  duration: 30, price: '₡8.000' },
  { id: 'barba',  name: 'Arreglo de Barba',  duration: 30, price: '₡5.000' },
  { id: 'combo',  name: 'Corte + Barba',     duration: 60, price: '₡12.000' },
  { id: 'navaja', name: 'Afeitado a Navaja', duration: 45, price: '₡6.000' },
  { id: 'nino',   name: 'Corte Niño',        duration: 30, price: '₡5.000' },
];

// Duración en minutos por servicio (para cálculos de solapamiento)
const SERVICE_DURATIONS = { corte: 30, barba: 30, combo: 60, navaja: 45, nino: 30 };

// Slots de 9:00 a 18:30 (cada 30 min). El filtro de cierre se aplica por duración.
function generateSlots() {
  const slots = [];
  for (let h = 9; h <= 18; h++)
    for (let m = 0; m < 60; m += 30)
      slots.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
  return slots; // 9:00 … 18:30
}

function toMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function barberWorksOnDay(barberId, dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  // Usar UTC para evitar desfases de zona horaria en el servidor
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  if (barberId === 1) return day >= 1 && day <= 6; // Lun=1 … Sáb=6
  if (barberId === 2) return day >= 1 && day <= 6; // Lun=1 … Sáb=6
  return false;
}

// ─── Admin Auth Middleware ─────────────────────────────────────────────────
function adminAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  if (!token || token !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  next();
}

// ══════════════════════════════════════════════════════════════════════════
//  PUBLIC ROUTES
// ══════════════════════════════════════════════════════════════════════════

// Servicios
app.get('/api/services', (req, res) => res.json(SERVICES));

// Slots disponibles
app.get('/api/available', async (req, res) => {
  try {
    const { barberId, date, service } = req.query;

    if (!barberId || !date) {
      return res.status(400).json({ error: 'Faltan parámetros' });
    }

    const id = Number(barberId);
    if (!barberWorksOnDay(id, date)) {
      return res.json({ available: [], worksToday: false });
    }

    // Duración del servicio solicitado (default 30 min)
    const duration = SERVICE_DURATIONS[service] || 30;
    const CLOSING = 18 * 60 + 30; // 18:30 en minutos

    // Citas ya confirmadas ese día para ese barbero
    const booked = await Appointment.find({
      barberId: id, date, status: 'confirmed'
    }).select('time service').lean();

    const available = generateSlots().filter(slotTime => {
      const slotStart = toMinutes(slotTime);
      const slotEnd   = slotStart + duration;

      // 1. El servicio debe terminar a las 18:30 o antes
      if (slotEnd > CLOSING) return false;

      // 2. No debe solaparse con ninguna cita existente
      return !booked.some(appt => {
        const apptStart = toMinutes(appt.time);
        const apptDur   = SERVICE_DURATIONS[appt.service] || 30;
        const apptEnd   = apptStart + apptDur;
        // Solapamiento: los rangos se cruzan si uno empieza antes de que el otro termine
        return slotStart < apptEnd && apptStart < slotEnd;
      });
    });

    return res.json({ available, worksToday: true });

  } catch (error) {
    console.error('ERROR EN /api/available:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear cita
app.post('/api/appointments', async (req, res) => {
  try {
    const { clientName, clientPhone, clientEmail, barberId, service, date, time } = req.body;
    if (!clientName || !clientPhone || !barberId || !service || !date || !time)
      return res.status(400).json({ error: 'Todos los campos son requeridos' });

    const id = parseInt(barberId);
    if (!barberWorksOnDay(id, date))
      return res.status(400).json({ error: 'El barbero no trabaja ese día' });

    // Comparar solo la fecha en UTC para evitar problemas de zona horaria (CR = UTC-6)
    const todayUTC = new Date().toISOString().split('T')[0];
    if (date < todayUTC)
      return res.status(400).json({ error: 'No puedes agendar en una fecha pasada' });

    const conflict = await Appointment.findOne({ barberId: id, date, time, status: 'confirmed' });
    if (conflict) return res.status(409).json({ error: 'Ese horario ya está ocupado' });

    let code, tries = 0;
    do { code = generateCode(); tries++; }
    while (await Appointment.findOne({ code }) && tries < 10);

    const appt = new Appointment({ code, clientName, clientPhone, clientEmail, barberId: id, service, date, time });
    await appt.save();

    res.status(201).json({ success: true, code, message: 'Cita confirmada',
      appointment: { code, clientName, barberId: id, service, date, time } });
  } catch (error) {
  console.error('ERROR EN /api/available:', error);
  return res.status(500).json({ error: error.message });
}
});

// Obtener cita por código (cliente)
app.get('/api/appointments/:code', async (req, res) => {
  const appt = await Appointment.findOne({ code: req.params.code.toUpperCase() });
  if (!appt) return res.status(404).json({ error: 'Código no encontrado' });
  res.json(appt);
});

// Modificar cita
app.put('/api/appointments/:code', async (req, res) => {
  try {
    const appt = await Appointment.findOne({ code: req.params.code.toUpperCase() });
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
      status: 'confirmed', _id: { $ne: appt._id }
    });
    if (conflict) return res.status(409).json({ error: 'Ese horario ya está ocupado' });

    appt.barberId = newBarberId;
    appt.service  = service || appt.service;
    appt.date     = newDate;
    appt.time     = newTime;
    await appt.save();

    res.json({ success: true, message: 'Cita modificada correctamente', appointment: appt });
  } catch (error) {
  console.error('ERROR EN /api/available:', error);
  return res.status(500).json({ error: error.message });
}
});

// Cancelar cita (cliente: requiere 24h)
app.delete('/api/appointments/:code', async (req, res) => {
  try {
    const appt = await Appointment.findOne({ code: req.params.code.toUpperCase() });
    if (!appt) return res.status(404).json({ error: 'Código no encontrado' });
    if (appt.status === 'cancelled') return res.status(400).json({ error: 'La cita ya fue cancelada' });

    const diffHours = (new Date(`${appt.date}T${appt.time}:00`) - new Date()) / 3600000;
    if (diffHours < 24)
      return res.status(400).json({ error: 'Solo puedes cancelar con al menos 24 horas de anticipación' });

    appt.status = 'cancelled';
    await appt.save();
    res.json({ success: true, message: 'Cita cancelada correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cancelar la cita' });
  }
});

// ══════════════════════════════════════════════════════════════════════════
//  ADMIN ROUTES  (requieren ADMIN_PASSWORD)
// ══════════════════════════════════════════════════════════════════════════

// Login admin
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (!password || password !== process.env.ADMIN_PASSWORD)
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  res.json({ token: process.env.ADMIN_PASSWORD }); // token = la misma password (simple)
});

// Estadísticas
app.get('/api/admin/stats', adminAuth, async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const in7Days  = new Date(); in7Days.setDate(in7Days.getDate() + 7);
    const in7Str   = in7Days.toISOString().split('T')[0];

    const [today, confirmed, cancelled, upcoming] = await Promise.all([
      Appointment.countDocuments({ date: todayStr, status: 'confirmed' }),
      Appointment.countDocuments({ status: 'confirmed' }),
      Appointment.countDocuments({ status: 'cancelled' }),
      Appointment.countDocuments({ date: { $gte: todayStr, $lte: in7Str }, status: 'confirmed' }),
    ]);

    res.json({ today, confirmed, cancelled, upcoming });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// Listar citas con filtros y paginación
app.get('/api/admin/appointments', adminAuth, async (req, res) => {
  try {
    const { date, barberId, status, search, page = 1, limit = 15 } = req.query;
    const filter = {};

    if (date)     filter.date    = date;
    if (barberId) filter.barberId = parseInt(barberId);
    if (status)   filter.status  = status;
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ clientName: rx }, { code: rx }, { clientPhone: rx }];
    }

    const total = await Appointment.countDocuments(filter);
    const appointments = await Appointment
      .find(filter)
      .sort({ date: -1, time: 1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    res.json({
      appointments,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener citas' });
  }
});

// Obtener cita específica (admin)
app.get('/api/admin/appointments/:code', adminAuth, async (req, res) => {
  const appt = await Appointment.findOne({ code: req.params.code.toUpperCase() });
  if (!appt) return res.status(404).json({ error: 'Código no encontrado' });
  res.json(appt);
});

// Cancelar cita (admin: sin restricción de 24h)
app.post('/api/admin/appointments/:code/cancel', adminAuth, async (req, res) => {
  try {
    const appt = await Appointment.findOne({ code: req.params.code.toUpperCase() });
    if (!appt) return res.status(404).json({ error: 'Código no encontrado' });
    if (appt.status === 'cancelled') return res.status(400).json({ error: 'Ya estaba cancelada' });
    appt.status = 'cancelled';
    await appt.save();
    res.json({ success: true, message: 'Cita cancelada por administrador' });
  } catch (err) {
    res.status(500).json({ error: 'Error al cancelar' });
  }
});

// ─── Servir frontend ──────────────────────────────────────────────────────
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`🐺 Lobo Barber Shop en http://localhost:${PORT}`));
//final