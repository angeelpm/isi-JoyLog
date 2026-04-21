import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db';

const app = express();
const PORT = process.env.PORT || 3002;

// Middlewares
app.use(cors());
app.use(express.json());

// Main entry
const start = async () => {
    await connectDB();

    app.get('/api/library/health', (req, res) => {
        res.json({ status: 'Library service is running' });
    });

    app.listen(PORT, () => {
        console.log(`Library Service running on port ${PORT}`);
    });
}

start();
