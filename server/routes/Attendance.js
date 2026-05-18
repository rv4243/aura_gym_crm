import { Router } from 'express';
import Attendance from '../models/Attendance.js';
import Member from '../models/Member.js';

const router = Router();

// GET /api/attendance?date=2024-06-01  — all attendance for a date
// GET /api/attendance?memberId=xxx      — history for one member
router.get('/', async (req, res) => {
    try {
        const { date, memberId } = req.query;
        const query = {};
        if (date) query.date = date;
        if (memberId) query.memberId = memberId;

        const records = await Attendance.find(query)
            .populate('memberId', 'name phone')
            .sort({ createdAt: -1 });

        res.json(records);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/attendance — mark one member present
router.post('/', async (req, res) => {
    try {
        const { memberId, date } = req.body;
        const today = date || new Date().toISOString().split('T')[0];

        // Check for existing record before inserting (avoids relying on error code)
        const existing = await Attendance.findOne({ memberId, date: today });
        if (existing) {
            return res.status(409).json({ error: 'Already marked present for this date' });
        }

        const record = await Attendance.create({ memberId, date: today });
        const populated = await record.populate('memberId', 'name phone');
        res.status(201).json(populated);
    } catch (err) {
        // Fallback duplicate key guard (race condition)
        const code = err.code ?? err.errorResponse?.code;
        if (code === 11000) {
            return res.status(409).json({ error: 'Already marked present for this date' });
        }
        res.status(400).json({ error: err.message });
    }
});

// POST /api/attendance/bulk — mark multiple members at once
router.post('/bulk', async (req, res) => {
    try {
        const { memberIds, date } = req.body;
        const today = date || new Date().toISOString().split('T')[0];

        const docs = memberIds.map((id) => ({ memberId: id, date: today }));

        // ordered:false continues even if some are duplicates
        const result = await Attendance.insertMany(docs, {
            ordered: false,
            rawResult: true,
        });

        const inserted = result.insertedCount ?? result.result?.nInserted ?? 0;
        res.status(201).json({
            inserted,
            message: `${inserted} attendance records saved`,
        });
    } catch (err) {
        // Partial insert — some succeeded, some were duplicates (BulkWriteError)
        const inserted =
            err.result?.insertedCount ??
            err.result?.result?.nInserted ??
            err.insertedCount ??
            0;
        if (err.name === 'MongoBulkWriteError' || err.name === 'BulkWriteError') {
            return res.status(207).json({
                inserted,
                message: `${inserted} marked, duplicates skipped`,
            });
        }
        res.status(400).json({ error: err.message });
    }
});

// DELETE /api/attendance/:id — undo attendance mark
router.delete('/:id', async (req, res) => {
    try {
        await Attendance.findByIdAndDelete(req.params.id);
        res.json({ message: 'Attendance removed' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;