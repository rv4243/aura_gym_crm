import { Router } from 'express';
import Member from '../models/Member.js';
import Plan from '../models/Plan.js';
import Payment from '../models/Payment.js';

const router = Router();

// GET /api/members — list all members (with optional search & status filter)
router.get('/', async (req, res) => {
    try {
        const { search, status } = req.query;
        const query = {};

        if (status) query.status = status;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ];
        }

        const members = await Member.find(query)
            .populate('planId', 'name durationDays price')
            .sort({ createdAt: -1 });

        res.json(members);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/members/:id — single member
router.get('/:id', async (req, res) => {
    try {
        const member = await Member.findById(req.params.id).populate('planId');
        if (!member) return res.status(404).json({ error: 'Member not found' });
        res.json(member);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/members — create member
router.post('/', async (req, res) => {
    try {
        const { name, phone, email, planId, joinDate, notes } = req.body;

        // Calculate expiry from plan duration
        let expiryDate = null;
        let plan = null;
        if (planId) {
            plan = await Plan.findById(planId);
            if (plan) {
                const start = joinDate ? new Date(joinDate) : new Date();
                expiryDate = new Date(start);
                expiryDate.setDate(expiryDate.getDate() + plan.durationDays);
            }
        }

        const member = await Member.create({
            name, phone, email, planId, notes,
            joinDate: joinDate || new Date(),
            expiryDate,
        });

        // Auto-create a pending payment when a plan is assigned
        if (plan) {
            await Payment.create({
                memberId: member._id,
                planId: plan._id,
                amount: plan.price,
                method: 'cash',        // default — staff updates when collected
                status: 'pending',
                notes: ` `,
            });
        }

        res.status(201).json(member);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// PUT /api/members/:id — update member
router.put('/:id', async (req, res) => {
    try {
        const { name, phone, email, planId, joinDate, status, notes } = req.body;

        // Recalculate expiry if plan changed
        let expiryDate = undefined;
        if (planId) {
            const plan = await Plan.findById(planId);
            if (plan) {
                const start = joinDate ? new Date(joinDate) : new Date();
                expiryDate = new Date(start);
                expiryDate.setDate(expiryDate.getDate() + plan.durationDays);
            }
        }

        const update = { name, phone, email, planId, status, notes };
        if (joinDate) update.joinDate = joinDate;
        if (expiryDate) update.expiryDate = expiryDate;

        const member = await Member.findByIdAndUpdate(req.params.id, update, {
            new: true,
            runValidators: true,
        }).populate('planId');

        if (!member) return res.status(404).json({ error: 'Member not found' });
        res.json(member);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE /api/members/:id
router.delete('/:id', async (req, res) => {
    try {
        const member = await Member.findByIdAndDelete(req.params.id);
        if (!member) return res.status(404).json({ error: 'Member not found' });
        res.json({ message: 'Member deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;