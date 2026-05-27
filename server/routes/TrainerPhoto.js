import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Trainer from '../models/Trainer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const UPLOAD_DIR = process.env.VERCEL
    ? '/tmp/uploads'
    : path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `trainer_${req.params.id}_${Date.now()}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) cb(null, true);
        else cb(new Error('Only JPG, PNG, and WebP images are allowed'));
    },
});

const router = Router();

router.post('/:id/photo', upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const existing = await Trainer.findById(req.params.id).select('photo');
        if (existing?.photo) {
            const oldPath = path.join(UPLOAD_DIR, existing.photo);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        const trainer = await Trainer.findByIdAndUpdate(
            req.params.id,
            { photo: req.file.filename },
            { new: true }
        );
        if (!trainer) return res.status(404).json({ error: 'Trainer not found' });
        res.json({ photo: req.file.filename, trainer });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id/photo', async (req, res) => {
    try {
        const trainer = await Trainer.findById(req.params.id).select('photo');
        if (!trainer) return res.status(404).json({ error: 'Trainer not found' });
        if (trainer.photo) {
            const filePath = path.join(UPLOAD_DIR, trainer.photo);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        await Trainer.findByIdAndUpdate(req.params.id, { photo: null });
        res.json({ message: 'Photo removed' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
