import express from 'express';
import cors from 'cors';
import libraryRoutes from './routes/libraryRoutes';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/', libraryRoutes);

app.get('/v1/library/health', (req, res) => {
    res.json({ status: 'Library service is running' });
});

export default app;
