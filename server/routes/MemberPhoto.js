import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Member from '../models/Member.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `member_${req.params.id}_${Date.now()}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },  // 5 MB max
    fileFilter: (_req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) cb(null, true);
        else cb(new Error('Only JPG, PNG, and WebP images are allowed'));
    },
});

const router = Router();

// POST /api/members/:id/photo — upload or replace profile picture
router.post('/:id/photo', upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        // Delete the old photo if one exists
        const existing = await Member.findById(req.params.id).select('photo');
        if (existing?.photo) {
            const oldPath = path.join(UPLOAD_DIR, existing.photo);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }

        // Save new filename to member record
        const member = await Member.findByIdAndUpdate(
            req.params.id,
            { photo: req.file.filename },
            { new: true }
        ).populate('planId', 'name durationDays price');

        if (!member) return res.status(404).json({ error: 'Member not found' });

        res.json({ photo: req.file.filename, member });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/members/:id/photo — remove profile picture
router.delete('/:id/photo', async (req, res) => {
    try {
        const member = await Member.findById(req.params.id).select('photo');
        if (!member) return res.status(404).json({ error: 'Member not found' });

        if (member.photo) {
            const filePath = path.join(UPLOAD_DIR, member.photo);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        await Member.findByIdAndUpdate(req.params.id, { photo: null });
        res.json({ message: 'Photo removed' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
