import { Router } from 'express';
import Payment from '../models/Payment.js';
import Member from '../models/Member.js';
import Plan from '../models/Plan.js';

const router = Router();

// ─── Helper: sync member after a payment is created/updated ───────────────────
//
//  Called whenever a payment is created OR when a pending payment turns paid.
//
//  Rules:
//    • planId  → ALWAYS updated (plan upgrade takes effect immediately)
//    • expiry  → ONLY extended when status === 'paid'
//    • status  → set to 'active' ONLY when status === 'paid'
//
async function syncMemberFromPayment(payment) {
    try {
        const plan   = await Plan.findById(payment.planId);
        const member = await Member.findById(payment.memberId);

        if (!plan || !member) {
            console.warn(`[Sync] skipped — plan: ${plan?.name ?? 'NOT FOUND'}, member: ${member?.name ?? 'NOT FOUND'}`);
            return;
        }

        const memberUpdate = {
            planId: payment.planId,   // always switch to the new plan
        };

        if (payment.status === 'paid') {
            // Start expiry from the payment date (today), not from old expiry.
            // This ensures: pay today for 10-day plan → expires in 10 days.
            const startDate = payment.paidDate ? new Date(payment.paidDate) : new Date();
            const newExpiry = new Date(startDate);
            newExpiry.setDate(newExpiry.getDate() + plan.durationDays);

            memberUpdate.expiryDate = newExpiry;
            memberUpdate.status     = 'active';

            console.log(`[Sync] ${member.name} → plan: ${plan.name}, starts: ${startDate.toDateString()}, expiry: ${newExpiry.toDateString()}`);
        } else {
            // Pending/overdue — switch plan but don't extend expiry yet
            console.log(`[Sync] ${member.name} → plan changed to: ${plan.name} (payment ${payment.status}, expiry unchanged)`);
        }

        await Member.findByIdAndUpdate(
            payment.memberId,
            { $set: memberUpdate },
            { new: true }
        );
    } catch (err) {
        console.error('[Sync] member update failed:', err.message);
    }
}

// ─────────────────────────────────────────────────────────────────────────────

// GET /api/payments — all payments, optional filter by month/status/member
router.get('/', async (req, res) => {
    try {
        const { memberId, status, month, year } = req.query;
        const query = {};

        if (memberId) query.memberId = memberId;
        if (status)   query.status   = status;

        if (month && year) {
            const start = new Date(year, month - 1, 1);
            const end   = new Date(year, month, 1);
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

// POST /api/payments — record a new payment (new member or renewal/upgrade)
router.post('/', async (req, res) => {
    try {
        const { memberId, planId, amount, method, status, paidDate, notes } = req.body;

        const payment = await Payment.create({
            memberId, planId, amount, method, notes,
            status:   status   || 'paid',
            paidDate: paidDate || new Date(),
        });

        // Always sync — planId updates immediately; expiry only extends if paid
        await syncMemberFromPayment(payment);

        const populated = await payment.populate([
            { path: 'memberId', select: 'name phone' },
            { path: 'planId',   select: 'name price' },
        ]);

        res.status(201).json(populated);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// PUT /api/payments/:id — update status (e.g. pending → paid)
router.put('/:id', async (req, res) => {
    try {
        const prevPayment = await Payment.findById(req.params.id);
        if (!prevPayment) return res.status(404).json({ error: 'Payment not found' });

        const payment = await Payment.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        // If just became paid → extend expiry now (planId was already set on creation)
        if (req.body.status === 'paid' && prevPayment.status !== 'paid') {
            await syncMemberFromPayment(payment);
        }

        res.json(payment);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

export default router;