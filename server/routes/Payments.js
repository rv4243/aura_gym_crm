import { Router } from 'express';
import Payment from '../models/Payment.js';
import Member from '../models/Member.js';
import Plan from '../models/Plan.js';

const router = Router();

// GET /api/payments — all payments, optional filter by month/status/member
router.get('/', async (req, res) => {
    try {
        const { memberId, status, month, year } = req.query;
        const query = {};

        if (memberId) query.memberId = memberId;
        if (status) query.status = status;

        if (month && year) {
            const start = new Date(year, month - 1, 1);
            const end = new Date(year, month, 1);
            query.paidDate = { $gte: start, $lt: end };
        }

        const payments = await Payment.find(query)
            .populate('memberId', 'name phone')
            .populate('planId', 'name price')
            .sort({ paidDate: -1 });

        res.json(payments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/payments — record a new payment
router.post('/', async (req, res) => {
    try {
        const { memberId, planId, amount, method, status, paidDate, notes } = req.body;

        const payment = await Payment.create({
            memberId, planId, amount, method, notes,
            status: status || 'paid',
            paidDate: paidDate || new Date(),
        });

        // If paid, extend member's expiry date
        if (payment.status === 'paid') {
            const plan = await Plan.findById(planId);
            const member = await Member.findById(memberId);
            if (plan && member) {
                const base = member.expiryDate && member.expiryDate > new Date()
                    ? member.expiryDate   // extend from current expiry
                    : new Date();          // expired — restart from today
                const newExpiry = new Date(base);
                newExpiry.setDate(newExpiry.getDate() + plan.durationDays);

                await Member.findByIdAndUpdate(memberId, {
                    expiryDate: newExpiry,
                    status: 'active',
                    planId,
                });
            }
        }

        const populated = await payment.populate([
            { path: 'memberId', select: 'name phone' },
            { path: 'planId', select: 'name price' },
        ]);

        res.status(201).json(populated);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// PUT /api/payments/:id — update status (e.g. pending → paid)
router.put('/:id', async (req, res) => {
    try {
        const payment = await Payment.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!payment) return res.status(404).json({ error: 'Payment not found' });
        res.json(payment);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

export default router;