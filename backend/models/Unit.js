const mongoose = require('mongoose');
const unitSchema = new mongoose.Schema({
  text: { type: String, required: true, unique: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
module.exports = mongoose.model('Unit', unitSchema);
