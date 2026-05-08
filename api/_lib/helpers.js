const { customAlphabet } = require('nanoid');

const generateCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);

const SERVICES = [
  { id: 'corte',  name: 'Corte de Cabello',  duration: 30, price: '₡8.000' },
  { id: 'barba',  name: 'Arreglo de Barba',  duration: 30, price: '₡5.000' },
  { id: 'combo',  name: 'Corte + Barba',     duration: 60, price: '₡12.000' },
  { id: 'navaja', name: 'Afeitado a Navaja', duration: 45, price: '₡6.000' },
  { id: 'nino',   name: 'Corte Niño',        duration: 30, price: '₡5.000' },
];

const SERVICE_DURATIONS = { corte: 30, barba: 30, combo: 60, navaja: 45, nino: 30 };

const PRICES_NUM = { corte: 8000, barba: 5000, combo: 12000, navaja: 6000, nino: 5000 };

const BARBER_NAMES = { 1: 'Lobo', 2: 'Cachetes' };

function generateSlots() {
  const slots = [];
  for (let h = 9; h <= 18; h++)
    for (let m = 0; m < 60; m += 30)
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  return slots;
}

function generateSlotsCustom(startTime, endTime, intervalMinutes) {
  const slots = [];
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const endTotal = endH * 60 + endM;
  let current = startH * 60 + startM;
  while (current < endTotal) {
    slots.push(`${String(Math.floor(current / 60)).padStart(2, '0')}:${String(current % 60).padStart(2, '0')}`);
    current += intervalMinutes;
  }
  return slots;
}

function toMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function barberWorksOnDay(barberId, dateStr) {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const day = new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
  return (barberId === 1 || barberId === 2) && day >= 1 && day <= 6;
}

module.exports = { generateCode, SERVICES, SERVICE_DURATIONS, PRICES_NUM, BARBER_NAMES, generateSlots, generateSlotsCustom, toMinutes, barberWorksOnDay };
