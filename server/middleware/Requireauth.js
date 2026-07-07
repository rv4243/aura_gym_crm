import { createClerkClient } from '@clerk/clerk-sdk-node';

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export async function requireAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];
        const payload = await clerk.verifyToken(token);
        req.auth = payload;
        next();
    } catch (err) {
        console.error('Auth error:', err.message);
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}


