const mongoose = require('mongoose');

const parameterGroupSchema = new mongoose.Schema({
  group: { type: String, required: true },
  subGroup: { type: String, required: true },
  productCategories: [{ type: String }],
  // For regular subgroups: parameter refs
  parameters: [{
    parameterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parameter' },
    name: { type: String }
  }],
  // For pesticide panels (food only)
  isPesticidePanel: { type: Boolean, default: false },
  pesticidePanelType: { type: String, enum: ['food', null], default: null },
  // Pesticide sub-panels (ONLY for food pesticides — water pesticides are normal subgroups)
  pesticideSubPanels: [{
    panelName: { type: String }, // 'GCMSMS' or 'LCMSMS'
    parameters: [{
      parameterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parameter' },
      name: { type: String }
    }]
  }]
}, { timestamps: true });

// Compound unique index
parameterGroupSchema.index({ group: 1, subGroup: 1 }, { unique: true });

module.exports = mongoose.model('ParameterGroup', parameterGroupSchema);
