import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Route imports ─────────────────────────────────────────────────────────────
import plansRouter       from './routes/Plans.js';
import membersRouter     from './routes/Members.js';
import memberPhotoRouter from './routes/MemberPhoto.js';
import paymentsRouter    from './routes/Payments.js';
import attendanceRouter  from './routes/Attendance.js';
import dashboardRouter   from './routes/Dashboard.js';

// ── Auth middleware ───────────────────────────────────────────────────────────
import { requireAuth } from './middleware/Requireauth.js';

const app  = express();
const PORT = process.env.PORT || 5000;

// ── CORS — allowed origins from env (comma-separated) ───────────────────────
const RAW_ORIGINS = process.env.ALLOWED_ORIGINS || 'http://localhost:5173';
const ALLOWED     = RAW_ORIGINS.split(',').map(o => o.trim());

app.use(cors({
    origin: (origin, cb) => {
        // Allow server-to-server / curl requests (no origin header)
        if (!origin) return cb(null, true);
        if (ALLOWED.includes(origin)) return cb(null, true);
        cb(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
}));
app.use(express.json());

// ── Static files: uploaded member photos ──────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Health check (public) ────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ── API routes (all protected by Clerk JWT) ───────────────────────────────────
app.use('/api/plans',      requireAuth, plansRouter);
app.use('/api/members',    requireAuth, membersRouter);
app.use('/api/members',    requireAuth, memberPhotoRouter);
app.use('/api/payments',   requireAuth, paymentsRouter);
app.use('/api/attendance', requireAuth, attendanceRouter);
app.use('/api/dashboard',  requireAuth, dashboardRouter);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
});

// ── MongoDB connection + server start ─────────────────────────────────────────
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✅  MongoDB connected');
        app.listen(PORT, () => {
            console.log(`🚀  Server running on http://localhost:${PORT}`);
            console.log(`    Health:     GET  /health`);
            console.log(`    Plans:      /api/plans`);
            console.log(`    Members:    /api/members`);
            console.log(`    Photos:     POST /api/members/:id/photo`);
            console.log(`    Payments:   /api/payments`);
            console.log(`    Attendance: /api/attendance`);
            console.log(`    Dashboard:  /api/dashboard`);
            console.log(`    Uploads:    /uploads/<filename>`);
        });
    })
    .catch((err) => {
        console.error('❌  MongoDB connection failed:', err.message);
        process.exit(1);
    });
