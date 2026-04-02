/* ═══════════════════════════════════════════════
   Lobo Barber Shop — Frontend App
   ═══════════════════════════════════════════════ */

const API_URL = '/api';

// ─── Intro animation ────────────────────────────
window.addEventListener('load', () => {
  setTimeout(() => {
    const intro = document.getElementById('intro-screen');
    if (intro) intro.classList.add('fade-out');
  }, 2800);
});

// ─── State ──────────────────────────────────────
const state = {
  currentStep: 1,
  barberId: null,
  service: null,
  duration: 30,
  date: null,
  time: null,
  name: null,
  phone: null,
  email: null,
  currentAppt: null,
  editTime: null,
};

const SERVICE_NAMES = {
  corte:  'Corte de Cabello',
  barba:  'Arreglo de Barba',
  combo:  'Corte + Barba',
  navaja: 'Afeitado a Navaja',
  nino:   'Corte Niño',
};

const BARBER_NAMES = {
  1: 'Lobo',
  2: 'Cachetes',
};

const SERVICES_DATA = [
  { id: 'corte',  name: 'Corte de Cabello',  duration: 30, price: '₡8.000',  icon: '💈' },
  { id: 'barba',  name: 'Arreglo de Barba',  duration: 30, price: '₡5.000',  icon: '🪒' },
  { id: 'combo',  name: 'Corte + Barba',     duration: 60, price: '₡12.000', icon: '⭐' },
  { id: 'navaja', name: 'Afeitado a Navaja', duration: 45, price: '₡6.000',  icon: '✨' },
  { id: 'nino',   name: 'Corte Niño',        duration: 30, price: '₡5.000',  icon: '🧒' },
];

const DAY_NAMES   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

// ─── Helpers ────────────────────────────────────
function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${DAY_NAMES[dt.getDay()]} ${d} de ${MONTH_NAMES[m-1]} ${y}`;
}

function today() {
  return new Date().toISOString().split('T')[0];
}

// ─── Toast ──────────────────────────────────────
function toast(type, title, msg) {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      ${msg ? `<div class="toast-msg">${msg}</div>` : ''}
    </div>`;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 300);
  }, 4000);
}

// ─── Steps ──────────────────────────────────────
function setStep(n) {
  document.querySelectorAll('.form-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`panel-${n}`).classList.add('active');

  for (let i = 1; i <= 4; i++) {
    const item = document.getElementById(`step-ind-${i}`);
    if (!item) continue;
    item.classList.remove('active', 'done');
    if (i < n) {
      item.classList.add('done');
      item.querySelector('.step-circle').innerHTML = '✓';
    } else if (i === n) {
      item.classList.add('active');
    } else {
      item.querySelector('.step-circle').textContent = i;
    }
  }
  state.currentStep = n;

  if (n > 1 && n < 5) document.getElementById('agendar').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function goStep(n) {
  if (n > state.currentStep) {
    if (!validateStep(state.currentStep)) return;
  }
  if (n === 4) buildSummary();
  setStep(n);
}

function selectService(id) {
  const svc = SERVICES_DATA.find(s => s.id === id);
  if (!svc) return;
  state.service  = svc.id;
  state.duration = svc.duration;
  state.time = null;
  document.querySelectorAll('.svc-pick').forEach(el =>
    el.classList.toggle('selected', el.dataset.service === id)
  );
  if (state.barberId && state.date) loadSlots();
}

function validateStep(s) {
  if (s === 1) {
    if (!state.service) { toast('error', 'Servicio requerido', 'Por favor selecciona un servicio.'); return false; }
    if (!state.barberId) { toast('error', 'Barbero requerido', 'Por favor elige un barbero.'); return false; }
  }
  if (s === 2) {
    if (!state.date) { toast('error', 'Fecha requerida', 'Por favor selecciona una fecha.'); return false; }
    if (!state.time) { toast('error', 'Horario requerido', 'Por favor selecciona un horario.'); return false; }
  }
  if (s === 3) {
    const name  = document.getElementById('inp-name').value.trim();
    const phone = document.getElementById('inp-phone').value.trim();
    if (!name)  { toast('error', 'Nombre requerido',   'Ingresa tu nombre completo.'); return false; }
    if (!phone) { toast('error', 'Teléfono requerido', 'Ingresa tu número de teléfono.'); return false; }
    state.name  = name;
    state.phone = '+506 ' + phone;
    state.email = document.getElementById('inp-email').value.trim();
  }
  return true;
}

// ─── Barber selection ───────────────────────────
function selectBarber(id) {
  state.barberId = id;
  document.querySelectorAll('.barber-option').forEach(el => {
    el.classList.toggle('selected', parseInt(el.dataset.barber) === id);
  });
  state.date = null;
  state.time = null;
  document.getElementById('inp-date').value = '';
  document.getElementById('slots-container').innerHTML = '';
}

// ─── Date input setup ───────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const dateInput = document.getElementById('inp-date');
  dateInput.min = today();
  const max = new Date();
  max.setDate(max.getDate() + 60);
  dateInput.max = max.toISOString().split('T')[0];

  const editDateInput = document.getElementById('edit-date');
  if (editDateInput) {
    editDateInput.min = today();
    editDateInput.max = max.toISOString().split('T')[0];
  }
});

// ─── Load slots ─────────────────────────────────
async function loadSlots() {
  const dateVal = document.getElementById('inp-date').value;
  if (!dateVal || !state.barberId) {
    if (!state.barberId) toast('info', 'Elige barbero primero', 'Vuelve al paso 1 y selecciona un barbero.');
    return;
  }
  state.date = dateVal;
  state.time = null;

  const container = document.getElementById('slots-container');
  const loading   = document.getElementById('slots-loading');
  container.innerHTML = '';
  loading.style.display = 'block';

  try {
    const res  = await fetch(`${API_URL}/available?barberId=${state.barberId}&date=${dateVal}&service=${state.service || 'corte'}`);
    const data = await res.json();
    loading.style.display = 'none';

    if (!data.worksToday) {
      container.innerHTML = `<div class="slots-empty">🚫 El barbero no trabaja este día.<br><small style="color:var(--text-dim)">Lobo y Cachetes trabajan Lun–Sáb</small></div>`;
      return;
    }

    if (!data.available.length) {
      container.innerHTML = `<div class="slots-empty">😔 No hay horarios disponibles para este día.</div>`;
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'slots-grid';
    data.available.forEach(slot => {
      const btn = document.createElement('button');
      btn.className = 'slot-btn';
      btn.textContent = slot;
      btn.onclick = () => selectSlot(slot, btn);
      grid.appendChild(btn);
    });
    container.appendChild(grid);

  } catch {
    loading.style.display = 'none';
    container.innerHTML = `<div class="slots-empty">❌ Error al cargar horarios. Intenta de nuevo.</div>`;
  }
}

function selectSlot(time, btn) {
  state.time = time;
  document.querySelectorAll('#slots-container .slot-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

// ─── Summary ────────────────────────────────────
function buildSummary() {
  const svcName    = SERVICE_NAMES[state.service] || '—';
  const barberName = BARBER_NAMES[state.barberId] || `Barbero ${state.barberId}`;
  document.getElementById('summary-box').innerHTML = `
    <div class="summary-row">
      <span class="summary-label">Servicio</span>
      <span class="summary-value">${svcName}</span>
    </div>
    <div class="summary-row">
      <span class="summary-label">Barbero</span>
      <span class="summary-value">${barberName}</span>
    </div>
    <div class="summary-row">
      <span class="summary-label">Fecha</span>
      <span class="summary-value">${formatDate(state.date)}</span>
    </div>
    <div class="summary-row">
      <span class="summary-label">Horario</span>
      <span class="summary-value gold">${state.time}</span>
    </div>
    <div class="summary-row">
      <span class="summary-label">Cliente</span>
      <span class="summary-value">${state.name}</span>
    </div>
    <div class="summary-row">
      <span class="summary-label">Teléfono</span>
      <span class="summary-value">${state.phone}</span>
    </div>
  `;
}

// ─── Confirm booking ────────────────────────────
async function confirmBooking() {
  const btn = document.getElementById('btn-confirm');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Procesando...';

  try {
    const res = await fetch(`${API_URL}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientName:  state.name,
        clientPhone: state.phone,
        clientEmail: state.email,
        barberId:    state.barberId,
        service:     state.service,
        date:        state.date,
        time:        state.time,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      toast('error', 'Error al reservar', data.error || 'Intenta de nuevo.');
      btn.disabled = false;
      btn.innerHTML = 'Confirmar Cita ✓';
      return;
    }

    const barberName = BARBER_NAMES[data.appointment.barberId] || `Barbero ${data.appointment.barberId}`;
    document.getElementById('conf-code').textContent = data.code;
    document.getElementById('conf-details').innerHTML = `
      <div class="booking-summary">
        <div class="summary-row"><span class="summary-label">Servicio</span><span class="summary-value">${SERVICE_NAMES[data.appointment.service]}</span></div>
        <div class="summary-row"><span class="summary-label">Barbero</span><span class="summary-value">${barberName}</span></div>
        <div class="summary-row"><span class="summary-label">Fecha</span><span class="summary-value">${formatDate(data.appointment.date)}</span></div>
        <div class="summary-row"><span class="summary-label">Hora</span><span class="summary-value gold">${data.appointment.time}</span></div>
      </div>`;

    setStep(5);
    toast('success', '¡Cita confirmada!', `Tu código es: ${data.code}`);

  } catch {
    toast('error', 'Error de red', 'Verifica tu conexión e intenta de nuevo.');
    btn.disabled = false;
    btn.innerHTML = 'Confirmar Cita ✓';
  }
}

// ─── Copy code ──────────────────────────────────
function copyCode() {
  const code = document.getElementById('conf-code').textContent;
  navigator.clipboard.writeText(code).then(() => {
    toast('success', '¡Copiado!', `Código ${code} copiado al portapapeles.`);
  });
}

// ─── Reset form ─────────────────────────────────
function resetForm() {
  state.barberId = null;
  state.service  = null;
  state.duration = 30;
  state.date = null;
  state.time = null;
  state.name = null;
  state.phone = null;
  state.email = null;

  document.querySelectorAll('.svc-pick').forEach(el => el.classList.remove('selected'));
  document.getElementById('inp-date').value  = '';
  document.getElementById('inp-name').value  = '';
  document.getElementById('inp-phone').value = '';
  document.getElementById('inp-email').value = '';
  document.querySelectorAll('.barber-option').forEach(el => el.classList.remove('selected'));
  document.getElementById('slots-container').innerHTML = '';
  document.getElementById('btn-confirm').disabled = false;
  document.getElementById('btn-confirm').innerHTML = 'Confirmar Cita ✓';

  for (let i = 1; i <= 4; i++) {
    const item = document.getElementById(`step-ind-${i}`);
    if (!item) continue;
    item.classList.remove('active', 'done');
    item.querySelector('.step-circle').textContent = i;
  }

  setStep(1);
  document.getElementById('agendar').scrollIntoView({ behavior: 'smooth' });
}

// ═══════════════════════════════════════════════
//  MANAGE SECTION
// ═══════════════════════════════════════════════

async function searchAppointment() {
  const code = document.getElementById('inp-manage-code').value.trim().toUpperCase();
  if (!code || code.length < 6) {
    toast('error', 'Código inválido', 'Ingresa un código de cita válido.');
    return;
  }

  try {
    const res  = await fetch(`${API_URL}/appointments/${code}`);
    const data = await res.json();

    if (!res.ok) {
      toast('error', 'No encontrado', data.error || 'Código no encontrado.');
      document.getElementById('appt-details').classList.remove('visible');
      return;
    }

    state.currentAppt = data;
    renderApptDetails(data);
    toast('success', 'Cita encontrada', `Hola ${data.clientName}!`);

  } catch {
    toast('error', 'Error de red', 'No se pudo conectar al servidor.');
  }
}

function renderApptDetails(appt) {
  const barberName = BARBER_NAMES[appt.barberId] || `Barbero ${appt.barberId}`;
  const isPast     = new Date(`${appt.date}T${appt.time}:00`) < new Date();
  const isCancelled = appt.status === 'cancelled';
  const diffH      = (new Date(`${appt.date}T${appt.time}:00`) - new Date()) / 3600000;
  const canModify  = !isCancelled && !isPast;
  const canCancel  = canModify && diffH >= 24;

  document.getElementById('appt-info').innerHTML = `
    <div class="appt-row"><label>Código</label><span style="font-family:monospace;letter-spacing:2px;color:var(--red)">${appt.code}</span></div>
    <div class="appt-row"><label>Cliente</label><span>${appt.clientName}</span></div>
    <div class="appt-row"><label>Teléfono</label><span>${appt.clientPhone}</span></div>
    <div class="appt-row"><label>Servicio</label><span>${SERVICE_NAMES[appt.service] || appt.service}</span></div>
    <div class="appt-row"><label>Barbero</label><span>${barberName}</span></div>
    <div class="appt-row"><label>Fecha</label><span>${formatDate(appt.date)}</span></div>
    <div class="appt-row"><label>Hora</label><span style="color:var(--red);font-weight:600">${appt.time}</span></div>
    <div class="appt-row"><label>Estado</label>
      <span class="appt-status ${appt.status}">
        ${appt.status === 'confirmed' ? '✅ Confirmada' : '❌ Cancelada'}
      </span>
    </div>
    ${!canCancel && canModify ? `<div style="margin-top:.75rem;padding:.75rem;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.2);border-radius:8px;font-size:.8rem;color:#F59E0B">⚠️ Solo puedes cancelar con 24h de anticipación.</div>` : ''}
    ${isPast && !isCancelled ? `<div style="margin-top:.75rem;padding:.75rem;background:rgba(100,100,100,.08);border:1px solid var(--border);border-radius:8px;font-size:.8rem;color:var(--text-muted)">Esta cita ya pasó.</div>` : ''}
  `;

  let actionsHtml = '';
  if (canModify) actionsHtml += `<button class="btn btn-warning" onclick="openEditModal()" style="flex:1;justify-content:center">✏️ Modificar</button>`;
  if (canCancel) actionsHtml += `<button class="btn btn-danger"  onclick="cancelAppointment()" style="flex:1;justify-content:center">🗑️ Cancelar</button>`;
  document.getElementById('manage-actions').innerHTML = actionsHtml;
  document.getElementById('appt-details').classList.add('visible');
}

// ─── Cancel ─────────────────────────────────────
async function cancelAppointment() {
  if (!confirm('¿Estás seguro de que deseas cancelar esta cita? Esta acción no se puede deshacer.')) return;

  try {
    const res  = await fetch(`${API_URL}/appointments/${state.currentAppt.code}`, { method: 'DELETE' });
    const data = await res.json();

    if (!res.ok) { toast('error', 'No se pudo cancelar', data.error); return; }

    toast('success', 'Cita cancelada', 'Tu cita fue cancelada exitosamente.');
    state.currentAppt.status = 'cancelled';
    renderApptDetails(state.currentAppt);

  } catch {
    toast('error', 'Error de red', 'No se pudo conectar al servidor.');
  }
}

// ─── Edit modal ─────────────────────────────────
function openEditModal() {
  const appt = state.currentAppt;
  document.getElementById('edit-service').value = appt.service;
  document.getElementById('edit-barber').value  = appt.barberId;
  document.getElementById('edit-date').value    = appt.date;
  state.editTime = appt.time;
  loadEditSlots();
  openModal('modal-edit');
}

async function loadEditSlots() {
  const barberId  = document.getElementById('edit-barber').value;
  const date      = document.getElementById('edit-date').value;
  const container = document.getElementById('edit-slots-container');
  container.innerHTML = '<span class="spinner spinner-red"></span>';

  if (!barberId || !date) { container.innerHTML = ''; return; }

  try {
    const res  = await fetch(`${API_URL}/available?barberId=${barberId}&date=${date}`);
    const data = await res.json();

    if (!data.worksToday) {
      container.innerHTML = `<div class="slots-empty" style="font-size:.8rem">🚫 El barbero no trabaja este día.</div>`;
      return;
    }

    let slots = data.available;
    if (state.currentAppt && date === state.currentAppt.date && parseInt(barberId) === state.currentAppt.barberId) {
      if (!slots.includes(state.currentAppt.time)) slots = [state.currentAppt.time, ...slots].sort();
    }

    if (!slots.length) {
      container.innerHTML = `<div class="slots-empty" style="font-size:.8rem">😔 No hay horarios disponibles.</div>`;
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'slots-grid';
    slots.forEach(slot => {
      const btn = document.createElement('button');
      btn.className = 'slot-btn' + (slot === state.editTime ? ' selected' : '');
      btn.textContent = slot;
      btn.onclick = () => {
        state.editTime = slot;
        grid.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      };
      grid.appendChild(btn);
    });
    container.innerHTML = '';
    container.appendChild(grid);

  } catch {
    container.innerHTML = `<div class="slots-empty" style="font-size:.8rem">❌ Error al cargar horarios.</div>`;
  }
}

async function submitEdit() {
  const barberId = parseInt(document.getElementById('edit-barber').value);
  const date     = document.getElementById('edit-date').value;
  const service  = document.getElementById('edit-service').value;
  const time     = state.editTime;

  if (!date || !time) { toast('error', 'Datos incompletos', 'Selecciona fecha y horario.'); return; }

  const btn = document.getElementById('btn-save-edit');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';

  try {
    const res = await fetch(`${API_URL}/appointments/${state.currentAppt.code}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barberId, service, date, time }),
    });
    const data = await res.json();

    if (!res.ok) {
      toast('error', 'Error al modificar', data.error);
      btn.disabled = false;
      btn.innerHTML = 'Guardar cambios';
      return;
    }

    toast('success', 'Cita modificada', '¡Tu cita fue actualizada correctamente!');
    state.currentAppt = data.appointment;
    renderApptDetails(data.appointment);
    closeModal('modal-edit');

  } catch {
    toast('error', 'Error de red', 'No se pudo conectar al servidor.');
    btn.disabled = false;
    btn.innerHTML = 'Guardar cambios';
  }
}

// ─── Modal helpers ──────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
  const btn = document.getElementById('btn-save-edit');
  if (btn) { btn.disabled = false; btn.innerHTML = 'Guardar cambios'; }
}

document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) closeModal(e.target.id);
});

// ─── Code input & nav ───────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const inp = document.getElementById('inp-manage-code');
  if (inp) {
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') searchAppointment(); });
    inp.addEventListener('input',   e => { e.target.value = e.target.value.toUpperCase(); });
  }
});

document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const target = document.querySelector(a.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});
