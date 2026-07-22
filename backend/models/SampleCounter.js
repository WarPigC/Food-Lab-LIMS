const mongoose = require('mongoose');

const sampleCounterSchema = new mongoose.Schema({
  currentValue: { type: Number, required: true, default: 0 },
  // Tracks the ISO date string (YYYY-MM-DD) of the last increment.
  // Used by getNextSerial() to detect day rollovers and snap the prefix to today's date.
  lastUpdatedDate: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('SampleCounter', sampleCounterSchema);
