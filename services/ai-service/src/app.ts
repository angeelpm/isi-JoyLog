import express from 'express';
import cors from 'cors';
import aiRoutes from './routes/aiRoutes';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/', aiRoutes);

app.get('/health', (_req, res) => {
    res.json({ status: 'AI service is running' });
});

export default app;
