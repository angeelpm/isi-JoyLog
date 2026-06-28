import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Main entry
app.use('/', authRoutes);

app.get('/v1/auth/health', (req, res) => {
    res.json({ status: 'Auth service is running' });
});

export default app;
