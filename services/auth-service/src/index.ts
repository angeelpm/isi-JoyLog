import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db';
import authRoutes from './routes/authRoutes';

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Main entry
const start = async () => {
    await connectDB();
    
    // Rutas de Core
    app.use('/', authRoutes);
    
    app.get('/api/auth/health', (req, res) => {
        res.json({ status: 'Auth service is running' });
    });

    app.listen(PORT, () => {
        console.log(`Auth Service running on port ${PORT}`);
    });
}

start();
