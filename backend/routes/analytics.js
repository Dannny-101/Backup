const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const Listing = require('../models/Listing');
const ChatMessage = require('../models/ChatMessage');

// GET dashboard stats
router.get('/dashboard', async (req, res) => {
    try {
        const totalLeads = await Lead.countDocuments();
        const newLeads = await Lead.countDocuments({ status: 'new' });
        const totalListings = await Listing.countDocuments({ isActive: true });
        const totalViews = await Listing.aggregate([{ $group: { _id: null, total: { $sum: '$views' } } }]);
        const totalInquiries = await Listing.aggregate([{ $group: { _id: null, total: { $sum: '$inquiries' } } }]);

        const leadsBySource = await Lead.aggregate([
            { $group: { _id: '$source', count: { $sum: 1 } } }
        ]);

        const leadsByStatus = await Lead.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        const recentLeads = await Lead.find().sort({ createdAt: -1 }).limit(5);

        // Last 7 days leads
        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 7);
        const weeklyLeads = await Lead.countDocuments({ createdAt: { $gte: last7Days } });

        res.json({
            success: true,
            data: {
                totalLeads,
                newLeads,
                totalListings,
                totalViews: totalViews[0]?.total || 0,
                totalInquiries: totalInquiries[0]?.total || 0,
                weeklyLeads,
                leadsBySource,
                leadsByStatus,
                recentLeads
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET lead trends (last 30 days)
router.get('/trends', async (req, res) => {
    try {
        const last30Days = new Date();
        last30Days.setDate(last30Days.getDate() - 30);

        const trends = await Lead.aggregate([
            { $match: { createdAt: { $gte: last30Days } } },
            {
                $group: {
                    _id: { 
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } 
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({ success: true, data: trends });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
