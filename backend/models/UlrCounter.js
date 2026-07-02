const mongoose = require('mongoose');

const ulrCounterSchema = new mongoose.Schema({
  // Static prefix, e.g. "TC-12434"
  prefix: { type: String, required: true, default: 'TC-12434' },
  // Current counter value (the incremental number after prefix+year)
  currentValue: { type: Number, required: true, default: 0 },
  // Manual offset applied by Admin Officer to correct accidental increments
  offset: { type: Number, required: true, default: 0 },
  // Tracks the last year the counter was used for (enables year-based reset)
  lastYear: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('UlrCounter', ulrCounterSchema);
