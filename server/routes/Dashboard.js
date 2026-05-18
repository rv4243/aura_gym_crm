import { Router } from 'express';
import Member from '../models/Member.js';
import Payment from '../models/Payment.js';
import Attendance from '../models/Attendance.js';

const router = Router();

// GET /api/dashboard — aggregated stats snapshot for the CRM home page
router.get('/', async (req, res) => {
    try {
        const now = new Date();

        // Member counts
        const totalMembers = await Member.countDocuments();
        const activeMembers = await Member.countDocuments({ status: 'active' });
        const expiredMembers = await Member.countDocuments({ status: 'expired' });
        const pausedMembers = await Member.countDocuments({ status: 'paused' });

        // Members whose expiry date is within the next 7 days (renewal alerts)
        const in7Days = new Date(now);
        in7Days.setDate(in7Days.getDate() + 7);
        const expiringThisWeek = await Member.countDocuments({
            status: 'active',
            expiryDate: { $gte: now, $lte: in7Days },
        });

        // Today's attendance count
        const todayStr = now.toISOString().split('T')[0]; // "YYYY-MM-DD"
        const todayAttendance = await Attendance.countDocuments({ date: todayStr });

        // This month's revenue (paid payments only)
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const revenueAgg = await Payment.aggregate([
            {
                $match: {
                    status: 'paid',
                    paidDate: { $gte: monthStart, $lt: monthEnd },
                },
            },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);
        const monthRevenue = revenueAgg[0]?.total ?? 0;

        // Pending / overdue payment count
        const pendingPayments = await Payment.countDocuments({
            status: { $in: ['pending', 'overdue'] },
        });

        res.json({
            members: {
                total: totalMembers,
                active: activeMembers,
                expired: expiredMembers,
                paused: pausedMembers,
                expiringThisWeek,
            },
            attendance: {
                today: todayAttendance,
            },
            revenue: {
                thisMonth: monthRevenue,
            },
            payments: {
                pending: pendingPayments,
            },
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
