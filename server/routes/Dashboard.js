import { Router } from 'express';
import Member  from '../models/Member.js';
import Payment from '../models/Payment.js';
import { syncMemberStatuses } from '../utils/statusSync.js';
import Attendance from '../models/Attendance.js';
import Expense from '../models/Expense.js';
import Trainer from '../models/Trainer.js';

const router = Router();

// GET /api/dashboard — aggregated stats snapshot for the CRM home page
router.get('/', async (req, res) => {
    try {
        await syncMemberStatuses();
        const now = new Date();

        const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

        // ── Member counts ─────────────────────────────────────────────────────
        const totalMembers   = await Member.countDocuments();
        const activeMembers  = await Member.countDocuments({ status: 'active' });
        const expiredMembers = await Member.countDocuments({ status: 'expired' });
        const pausedMembers  = await Member.countDocuments({ status: 'paused' });

        // Members expiring within next 7 days
        const in7Days = new Date(now);
        in7Days.setDate(in7Days.getDate() + 7);
        const expiringThisWeek = await Member.countDocuments({
            status: 'active',
            expiryDate: { $gte: now, $lte: in7Days },
        });

        // ── Attendance ────────────────────────────────────────────────────────
        const todayStr       = now.toISOString().split('T')[0];
        const todayAttendance = await Attendance.countDocuments({ date: todayStr });

        // ── Revenue (this month, paid payments only) ──────────────────────────
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1);

        const revenueAgg = await Payment.aggregate([
            { $match: { status: 'paid', paidDate: { $gte: monthStart, $lt: monthEnd } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);
        const monthRevenue = revenueAgg[0]?.total ?? 0;

        // ── Expenses (this month) ─────────────────────────────────────────────
        const expenseAgg = await Expense.aggregate([
            { $match: { date: { $gte: monthStart, $lt: monthEnd } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]);
        const monthExpenses = expenseAgg[0]?.total ?? 0;
        const netProfit     = monthRevenue - monthExpenses;

        // Expense breakdown by category this month
        const expenseByCategoryAgg = await Expense.aggregate([
            { $match: { date: { $gte: monthStart, $lt: monthEnd } } },
            { $group: { _id: '$category', total: { $sum: '$amount' } } },
            { $sort: { total: -1 } },
        ]);
        const expenseByCategory = Object.fromEntries(
            expenseByCategoryAgg.map(e => [e._id, e.total])
        );

        // ── Pending/overdue payments ──────────────────────────────────────────
        const pendingPayments = await Payment.countDocuments({
            status: { $in: ['pending', 'overdue'] },
        });

        // ── Trainers ──────────────────────────────────────────────────────────
        const totalTrainers  = await Trainer.countDocuments();
        const activeTrainers = await Trainer.countDocuments({ status: 'active' });

        // ── 6-month historical stats aggregation ──────────────────────────────
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0,0,0,0);

        const revenueHistoryAgg = await Payment.aggregate([
            { $match: { status: 'paid', paidDate: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: {
                        year: { $year: '$paidDate' },
                        month: { $month: '$paidDate' }
                    },
                    total: { $sum: '$amount' }
                }
            }
        ]);

        const expenseHistoryAgg = await Expense.aggregate([
            { $match: { date: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: {
                        year: { $year: '$date' },
                        month: { $month: '$date' }
                    },
                    total: { $sum: '$amount' }
                }
            }
        ]);

        // Build list of last 6 months history
        const history = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const mNum = d.getMonth() + 1;
            const yNum = d.getFullYear();

            const rev = revenueHistoryAgg.find(r => r._id.year === yNum && r._id.month === mNum)?.total ?? 0;
            const exp = expenseHistoryAgg.find(e => e._id.year === yNum && e._id.month === mNum)?.total ?? 0;

            history.push({
                month: MONTHS[d.getMonth()],
                year: yNum,
                revenue: rev,
                expenses: exp,
                profit: rev - exp
            });
        }

        // ── Recent Payments & Attendance ─────────────────────────────────────
        const recentPayments = await Payment.find()
            .populate('memberId', 'name photo')
            .populate('planId', 'name')
            .sort({ createdAt: -1 })
            .limit(5);

        const recentAttendance = await Attendance.find()
            .populate('memberId', 'name photo')
            .sort({ date: -1, createdAt: -1 })
            .limit(5);

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
            expenses: {
                thisMonth: monthExpenses,
                byCategory: expenseByCategory,
            },
            profit: {
                thisMonth: netProfit,
            },
            payments: {
                pending: pendingPayments,
            },
            trainers: {
                total: totalTrainers,
                active: activeTrainers,
            },
            history,
            recentPayments,
            recentAttendance,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
