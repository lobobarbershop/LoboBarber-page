const mongoose = require('mongoose');

const schema = new mongoose.Schema({
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

module.exports = mongoose.models.Appointment || mongoose.model('Appointment', schema);
