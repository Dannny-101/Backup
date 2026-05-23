const mongoose = require('mongoose');

const chatSessionSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true, index: true },
    name: String,
    email: String,
    phone: String,
    status: { type: String, enum: ['active', 'closed'], default: 'active' },
    closedAt: Date,
    closedBy: String, // admin name or 'visitor'
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ChatSession', chatSessionSchema);
