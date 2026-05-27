import { Router } from 'express';
import Trainer from '../models/Trainer.js';

const router = Router();

// GET /api/trainers — list with optional search/status filter
router.get('/', async (req, res) => {
    try {
        const { search, status } = req.query;
        const query = {};

        if (status) query.status = status;
        if (search) {
            query.$or = [
                { name:      { $regex: search, $options: 'i' } },
                { phone:     { $regex: search, $options: 'i' } },
                { specialty: { $regex: search, $options: 'i' } },
            ];
        }

        const trainers = await Trainer.find(query).sort({ createdAt: -1 });
        res.json(trainers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/trainers/:id — single trainer with their assigned members
router.get('/:id', async (req, res) => {
    try {
        const trainer = await Trainer.findById(req.params.id);
        if (!trainer) return res.status(404).json({ error: 'Trainer not found' });
        res.json(trainer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/trainers — create
router.post('/', async (req, res) => {
    try {
        const { name, phone, email, specialty, salary, joinDate, status, notes } = req.body;
        const trainer = await Trainer.create({ name, phone, email, specialty, salary, joinDate, status, notes });
        res.status(201).json(trainer);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// PUT /api/trainers/:id — update
router.put('/:id', async (req, res) => {
    try {
        const trainer = await Trainer.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        );
        if (!trainer) return res.status(404).json({ error: 'Trainer not found' });
        res.json(trainer);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE /api/trainers/:id
router.delete('/:id', async (req, res) => {
    try {
        const trainer = await Trainer.findByIdAndDelete(req.params.id);
        if (!trainer) return res.status(404).json({ error: 'Trainer not found' });
        res.json({ message: 'Trainer deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
