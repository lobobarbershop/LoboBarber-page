const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  code:        { type: String, unique: true, required: true },
  clientName:  { type: String, required: true, trim: true },
  clientPhone: { type: String, required: true, trim: true },
  clientEmail: { type: String, trim: true },
  barberId:    { type: Number, required: true },
  service:     { type: String, required: true },
  date:        { type: String, required: true },
  time:        { type: String, required: true },
  status:      { type: String, default: 'confirmed', enum: ['confirmed', 'cancelled'] },
  createdAt:   { type: Date, default: Date.now },
});

const botConfigSchema = new mongoose.Schema({
  systemPrompt: { type: String, required: true },
  updatedAt:    { type: Date, default: Date.now },
});

const barberExceptionSchema = new mongoose.Schema({
  barberId:  { type: Number, required: true },
  date:      { type: String, required: true },
  type:      { type: String, required: true, enum: ['day_off', 'custom_hours'] },
  startTime: { type: String },
  endTime:   { type: String },
  note:      { type: String },
  createdAt: { type: Date, default: Date.now },
});

const barberSettingsSchema = new mongoose.Schema({
  barberId:     { type: Number, required: true, unique: true },
  slotInterval: { type: Number, default: 30 },
  startTime:    { type: String, default: '09:00' },
  endTime:      { type: String, default: '18:30' },
});

const Appointment     = mongoose.models.Appointment     || mongoose.model('Appointment', appointmentSchema);
const BotConfig       = mongoose.models.BotConfig       || mongoose.model('BotConfig', botConfigSchema);
const BarberException = mongoose.models.BarberException || mongoose.model('BarberException', barberExceptionSchema);
const BarberSettings  = mongoose.models.BarberSettings  || mongoose.model('BarberSettings', barberSettingsSchema);

const waMessageSchema = new mongoose.Schema({
  phone:     { type: String, required: true },
  body:      { type: String, required: true },
  direction: { type: String, enum: ['inbound', 'outbound'], required: true },
  read:      { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const waConversationSchema = new mongoose.Schema({
  phone:         { type: String, required: true, unique: true },
  customerName:  { type: String, default: '' },
  lastMessage:   { type: String, default: '' },
  lastMessageAt: { type: Date, default: Date.now },
  unreadCount:   { type: Number, default: 0 },
  lastDirection: { type: String, enum: ['inbound', 'outbound'], default: 'inbound' },
});

const WaMessage      = mongoose.models.WaMessage      || mongoose.model('WaMessage', waMessageSchema);
const WaConversation = mongoose.models.WaConversation || mongoose.model('WaConversation', waConversationSchema);

const serviceSchema = new mongoose.Schema({
  slug:     { type: String, required: true, unique: true },
  name:     { type: String, required: true },
  duration: { type: Number, required: true },
  price:    { type: Number, required: true },
  icon:     { type: String, default: '✂️' },
  active:   { type: Boolean, default: true },
  order:    { type: Number, default: 0 },
});
const ServiceModel = mongoose.models.ServiceModel || mongoose.model('ServiceModel', serviceSchema);

const barberSchema = new mongoose.Schema({
  barberId: { type: Number, required: true, unique: true },
  name:     { type: String, required: true },
  title:    { type: String, default: 'Maestro Barbero' },
  emoji:    { type: String, default: '✂️' },
  active:   { type: Boolean, default: true },
  order:    { type: Number, default: 0 },
});
const BarberModel = mongoose.models.BarberModel || mongoose.model('BarberModel', barberSchema);

module.exports = { Appointment, BotConfig, BarberException, BarberSettings, WaMessage, WaConversation, ServiceModel, BarberModel };
