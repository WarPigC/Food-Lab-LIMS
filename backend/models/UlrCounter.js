const mongoose = require('mongoose');

const ulrCounterSchema = new mongoose.Schema({
  // Static prefix, e.g. "TC-12434260"
  prefix: { type: String, required: true, default: 'TC-12434260' },
  // Static suffix character appended after the number, e.g. "F"
  suffix: { type: String, required: true, default: 'F' },
  // Current counter value (the number between prefix and suffix)
  currentValue: { type: Number, required: true, default: 0 },
  // Manual offset applied by Lab Head to correct accidental increments
  offset: { type: Number, required: true, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('UlrCounter', ulrCounterSchema);
