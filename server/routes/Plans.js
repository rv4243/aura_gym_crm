import { Router } from 'express';
import Plan from '../models/Plan.js';

const router = Router();

// GET /api/plans
router.get('/', async (req, res) => {
    try {
        const plans = await Plan.find({ isActive: true }).sort({ price: 1 });
        res.json(plans);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/plans/all — including inactive
router.get('/all', async (req, res) => {
    try {
        const plans = await Plan.find().sort({ createdAt: -1 });
        res.json(plans);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/plans
router.post('/', async (req, res) => {
    try {
        const { name, durationDays, price, description } = req.body;
        const plan = await Plan.create({ name, durationDays, price, description });
        res.status(201).json(plan);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// PUT /api/plans/:id
router.put('/:id', async (req, res) => {
    try {
        const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!plan) return res.status(404).json({ error: 'Plan not found' });
        res.json(plan);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE /api/plans/:id — soft delete (set isActive: false)
router.delete('/:id', async (req, res) => {
    try {
        const plan = await Plan.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        );
        if (!plan) return res.status(404).json({ error: 'Plan not found' });
        res.json({ message: 'Plan deactivated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;