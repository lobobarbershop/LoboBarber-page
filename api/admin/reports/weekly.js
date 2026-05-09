const connectDB = require('../../_lib/mongodb');
const { Appointment, ServiceModel, BarberModel } = require('../../_lib/models');
const setCors = require('../../_lib/cors');
const adminAuth = require('../../_lib/auth');
const { PRICES_NUM, BARBER_NAMES } = require('../../_lib/helpers'); // mantener como fallback

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();
  if (!adminAuth(req, res)) return;

  try {
    await connectDB();

    // Calcular weekStart (lunes de la semana)
    let weekStart;
    if (req.query.weekStart) {
      weekStart = req.query.weekStart;
    } else {
      const today = new Date();
      const day = today.getUTCDay(); // 0=Dom, 1=Lun...
      const diff = day === 0 ? -6 : 1 - day;
      today.setUTCDate(today.getUTCDate() + diff);
      weekStart = today.toISOString().split('T')[0];
    }

    // weekEnd = weekStart + 6 días
    const [wy, wm, wd] = weekStart.split('-').map(Number);
    const endDate = new Date(Date.UTC(wy, wm - 1, wd));
    endDate.setUTCDate(endDate.getUTCDate() + 6);
    const weekEnd = endDate.toISOString().split('T')[0];

    // weekLabel
    const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const [sy, sm, sd] = weekStart.split('-').map(Number);
    const [ey, em, ed] = weekEnd.split('-').map(Number);
    const weekLabel = `${sd} ${MONTHS_ES[sm - 1]} – ${ed} ${MONTHS_ES[em - 1]} ${ey}`;

    // Obtener citas confirmadas de la semana
    const appointments = await Appointment.find({
      date: { $gte: weekStart, $lte: weekEnd },
      status: 'confirmed',
    }).lean();

    // Cargar precios y barberos dinámicos desde BD
    const dbServices = await ServiceModel.find().lean();
    const pricesMap = {};
    dbServices.forEach(s => { pricesMap[s.slug] = s.price; });

    const dbBarbers = await BarberModel.find({ active: true }).sort({ order: 1 }).lean();
    const barberNamesMap = {};
    dbBarbers.forEach(b => { barberNamesMap[b.barberId] = b.name; });

    // Construir lista de IDs de barberos (BD o fallback a [1,2])
    const barberIds = dbBarbers.length
      ? dbBarbers.map(b => b.barberId)
      : [1, 2];

    // Agrupar por barbero
    const barbers = barberIds.map(id => {
      const barberAppts = appointments.filter(a => a.barberId === id);
      const services = {};
      let totalRevenue = 0;
      barberAppts.forEach(a => {
        services[a.service] = (services[a.service] || 0) + 1;
        totalRevenue += pricesMap[a.service] !== undefined ? pricesMap[a.service] : (PRICES_NUM[a.service] || 0);
      });
      return {
        id,
        name: barberNamesMap[id] || BARBER_NAMES[id] || `Barbero ${id}`,
        totalAppointments: barberAppts.length,
        totalRevenue,
        services,
      };
    });

    const grandTotal = {
      appointments: barbers.reduce((s, b) => s + b.totalAppointments, 0),
      revenue: barbers.reduce((s, b) => s + b.totalRevenue, 0),
    };

    res.json({ weekLabel, weekStart, weekEnd, barbers, grandTotal });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al generar reporte' });
  }
};
