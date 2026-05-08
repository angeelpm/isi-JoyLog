import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret123';

export interface AuthenticatedRequest extends Request {
    user?: { id: string, username: string };
}

export const verifyToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ message: 'No token provided, authorization denied' });
        return;
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string, username: string };
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};
