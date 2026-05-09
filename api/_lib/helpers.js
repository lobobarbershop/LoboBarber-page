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
  return barberId > 0 && day >= 1 && day <= 6;
}

const DEFAULT_SERVICES_SEED = [
  { slug: 'corte',  name: 'Corte de Cabello',  duration: 30, price: 8000,  icon: '💈', order: 1 },
  { slug: 'barba',  name: 'Arreglo de Barba',  duration: 30, price: 5000,  icon: '🪒', order: 2 },
  { slug: 'combo',  name: 'Corte + Barba',     duration: 60, price: 12000, icon: '⭐', order: 3 },
  { slug: 'navaja', name: 'Afeitado a Navaja', duration: 45, price: 6000,  icon: '✨', order: 4 },
  { slug: 'nino',   name: 'Corte Niño',        duration: 30, price: 5000,  icon: '🧒', order: 5 },
];

const DEFAULT_BARBERS_SEED = [
  { barberId: 1, name: 'Lobo',     title: 'Maestro Barbero', emoji: '🐺', order: 1 },
  { barberId: 2, name: 'Cachetes', title: 'Maestro Barbero', emoji: '✂️', order: 2 },
];

function formatPrice(num) {
  return '₡' + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function slugify(text) {
  return text.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

module.exports = { generateCode, SERVICES, SERVICE_DURATIONS, PRICES_NUM, BARBER_NAMES, generateSlots, generateSlotsCustom, toMinutes, barberWorksOnDay, DEFAULT_SERVICES_SEED, DEFAULT_BARBERS_SEED, formatPrice, slugify };
