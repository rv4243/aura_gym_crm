import { Router } from 'express';
import Expense from '../models/Expense.js';

const router = Router();

// GET /api/expenses — list with optional filters
router.get('/', async (req, res) => {
    try {
        const { category, month, year } = req.query;
        const query = {};

        if (category) query.category = category;

        if (month && year) {
            const start = new Date(year, month - 1, 1);
            const end   = new Date(year, month, 1);
            query.date = { $gte: start, $lt: end };
        }

        const expenses = await Expense.find(query).sort({ date: -1 });
        res.json(expenses);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/expenses — create
router.post('/', async (req, res) => {
    try {
        const { title, amount, category, date, paidTo, method, notes } = req.body;
        const expense = await Expense.create({ title, amount, category, date, paidTo, method, notes });
        res.status(201).json(expense);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// PUT /api/expenses/:id — update
router.put('/:id', async (req, res) => {
    try {
        const expense = await Expense.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        );
        if (!expense) return res.status(404).json({ error: 'Expense not found' });
        res.json(expense);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE /api/expenses/:id
router.delete('/:id', async (req, res) => {
    try {
        const expense = await Expense.findByIdAndDelete(req.params.id);
        if (!expense) return res.status(404).json({ error: 'Expense not found' });
        res.json({ message: 'Expense deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
