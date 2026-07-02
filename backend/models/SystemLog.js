const mongoose = require('mongoose');

const systemLogSchema = new mongoose.Schema({
  level: {
    type: String,
    enum: ['info', 'warn', 'error', 'audit'],
    required: true
  },
  event: {
    type: String,  // e.g., 'JOB_CREATED', 'LOGIN_FAILED', 'API_REQUEST'
    required: true
  },
  message: { type: String, required: true },

  // Who performed the action
  user: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String },
    role: { type: String }
  },

  // What was affected (for audit logs)
  target: {
    model: { type: String },       // 'Job', 'TestInstance', 'User', etc.
    documentId: { type: String },   // The _id of the affected document
    identifier: { type: String }    // Human-readable: jobCode, testCode, user email
  },

  // Before/after diff for mutations
  diff: { type: mongoose.Schema.Types.Mixed },

  // HTTP request context
  request: {
    method: { type: String },
    url: { type: String },
    ip: { type: String },
    userAgent: { type: String },
    statusCode: { type: Number },
    responseTimeMs: { type: Number }
  },

  // Error details (for error/warn levels)
  error: {
    name: { type: String },
    message: { type: String },
    stack: { type: String }
  },

  // 'server' or 'client'
  source: { type: String, enum: ['server', 'client'], default: 'server' },

  timestamp: { type: Date, default: Date.now }
}, {
  // No updatedAt needed for immutable logs
  timestamps: false
});

// TTL: auto-delete after 180 days
systemLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });
// Query optimization indexes
systemLogSchema.index({ level: 1, timestamp: -1 });
systemLogSchema.index({ event: 1, timestamp: -1 });
systemLogSchema.index({ 'user.id': 1, timestamp: -1 });
systemLogSchema.index({ 'target.identifier': 1 });

module.exports = mongoose.model('SystemLog', systemLogSchema);
