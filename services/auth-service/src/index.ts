import app from './app';
import { connectDB } from './config/db';

const PORT = process.env.PORT || 3001;

const start = async () => {
    await connectDB();

    app.listen(PORT, () => {
        console.log(`Auth Service running on port ${PORT}`);
    });
};

start();
