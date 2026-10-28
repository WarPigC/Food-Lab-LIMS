const mongoose = require('mongoose');

const parameterEntrySchema = new mongoose.Schema({
  name:             { type: String, required: true },
  unit:             { type: String, default: '-' },
  testMethod:       { type: String, default: '' },
  // Food and Fatty Acid reports use specification column
  specification:    { type: String, default: '' },
  // Water ISO 10500 report uses these two columns instead
  requirement:      { type: String, default: '' },   // Requirement (Acceptable Limit)
  permissibleLimit: { type: String, default: '' },   // Permissible Limit in absence of Alternate Source
  // Category dividers within parameter list (e.g. "General Parameters")
  isCategoryHeader: { type: Boolean, default: false }
});

const variantSchema = new mongoose.Schema({
  key:        { type: String, required: true }, // 'compiled' | 'full' | 'GCMSMS' | 'LCMSMS'
  label:      { type: String, required: true }, // e.g. '4 Compiled Compounds', 'GCM Panel (GCMSMS)'
  parameters: [parameterEntrySchema]
});

const specialProfileSchema = new mongoose.Schema({
  key:         { type: String, required: true, unique: true }, // 'waterIso10500' | 'pesticides' | 'fattyAcids'
  label:       { type: String, required: true },
  description: { type: String, default: '' },
  isExclusive: { type: Boolean, default: false },
  // Top-level parameters (used by waterIso10500 directly)
  parameters:  [parameterEntrySchema],
  // Variants: for fattyAcids (compiled / full) and pesticides (GCMSMS / LCMSMS)
  variants:    [variantSchema]
}, { timestamps: true });

module.exports = mongoose.model('SpecialProfile', specialProfileSchema);
