const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
  title: { type: String, required: true },
  severity: { type: String, enum: ['Advisory', 'Warning', 'Critical'], default: 'Advisory' },
  species: { type: String, default: 'All Species' },
  targetBarangay: { type: String, required: true },
  description: { type: String, required: true },
  instruction: { type: String },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Alert', AlertSchema);