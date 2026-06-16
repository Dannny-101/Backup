const mongoose = require('mongoose');

const propertyAgentSchema = new mongoose.Schema({
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    agentName: { type: String, required: true },
    agentPhone: { type: String, required: true },
    agentEmail: { type: String },
    priority: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

propertyAgentSchema.index({ propertyId: 1, priority: 1 });

module.exports = mongoose.model('PropertyAgent', propertyAgentSchema);
