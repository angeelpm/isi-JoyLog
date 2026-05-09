import app from './app';
import { connectDB } from './config/db';

const PORT = process.env.PORT || 3002;

const start = async () => {
    await connectDB();

    app.listen(PORT, () => {
        console.log(`Library Service running on port ${PORT}`);
    });
};

start();
