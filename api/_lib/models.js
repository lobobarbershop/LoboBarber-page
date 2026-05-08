const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  code:        { type: String, unique: true, required: true },
  clientName:  { type: String, required: true, trim: true },
  clientPhone: { type: String, required: true, trim: true },
  clientEmail: { type: String, trim: true },
  barberId:    { type: Number, required: true, enum: [1, 2] },
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
  barberId:  { type: Number, required: true, enum: [1, 2] },
  date:      { type: String, required: true },
  type:      { type: String, required: true, enum: ['day_off', 'custom_hours'] },
  startTime: { type: String },
  endTime:   { type: String },
  note:      { type: String },
  createdAt: { type: Date, default: Date.now },
});

const barberSettingsSchema = new mongoose.Schema({
  barberId:     { type: Number, required: true, unique: true, enum: [1, 2] },
  slotInterval: { type: Number, default: 30 },
  startTime:    { type: String, default: '09:00' },
  endTime:      { type: String, default: '18:30' },
});

const Appointment     = mongoose.models.Appointment     || mongoose.model('Appointment', appointmentSchema);
const BotConfig       = mongoose.models.BotConfig       || mongoose.model('BotConfig', botConfigSchema);
const BarberException = mongoose.models.BarberException || mongoose.model('BarberException', barberExceptionSchema);
const BarberSettings  = mongoose.models.BarberSettings  || mongoose.model('BarberSettings', barberSettingsSchema);

module.exports = { Appointment, BotConfig, BarberException, BarberSettings };
