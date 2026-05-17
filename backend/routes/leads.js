const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');

// POST create lead (from any source)
const visitorId = req.cookies.visitorId || uuidv4();
res.cookie('visitorId', visitorId, { 
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
});

// Save visitorId with lead
lead.visitorId = visitorId;
router.post('/', async (req, res) => {
    try {
        const lead = await Lead.create({
            ...req.body,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        // If linked to listing, increment inquiries
        if (req.body.listingId) {
            const Listing = require('../models/Listing');
            await Listing.findByIdAndUpdate(req.body.listingId, { $inc: { inquiries: 1 } });
        }

        res.status(201).json({ success: true, data: lead });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// GET all leads (admin)
router.get('/', async (req, res) => {
    try {
        const { status, source, search } = req.query;
        let query = {};

        if (status) query.status = status;
        if (source) query.source = source;
        if (search) {
            query.$or = [
                { name: new RegExp(search, 'i') },
                { email: new RegExp(search, 'i') },
                { phone: new RegExp(search, 'i') }
            ];
        }

        const leads = await Lead.find(query).sort({ createdAt: -1 });
        res.json({ success: true, count: leads.length, data: leads });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET single lead
router.get('/:id', async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id);
        if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });
        res.json({ success: true, data: lead });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT update lead status
router.put('/:id', async (req, res) => {
    try {
        req.body.updatedAt = Date.now();
        const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });
        res.json({ success: true, data: lead });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// DELETE lead
router.delete('/:id', async (req, res) => {
    try {
        const lead = await Lead.findByIdAndDelete(req.params.id);
        if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });
        res.json({ success: true, message: 'Lead deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
