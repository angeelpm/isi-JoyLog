import app from './app';
import { connectDB } from './config/db';

const PORT = process.env.PORT || 3002;

app.get('/api/library/health', (req, res) => {
    res.json({ status: 'Library service is running' });
});

export const start = async () => {
    if (process.env.NODE_ENV !== 'test') {
        await connectDB();
        app.listen(PORT, () => {
            console.log(`Library Service running on port ${PORT}`);
        });
    }
}

start();

export default app;
