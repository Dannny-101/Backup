const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, default: '' },
    location: {
        address: String,
        city: String,
        area: String,
        university: String,
        lat: Number,
        lng: Number
    },
    linkedUniversities: [{
        name: { type: String, required: true },
        lat: { type: Number, required: true },
        lng: { type: Number, required: true }
    }],
    recommendedUniversity: { type: String, default: '' },
    amenities: [String],
    images: [String],
    whatsappNumber: String,
    wechatId: String,
    agentName: String,
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Property', propertySchema);
