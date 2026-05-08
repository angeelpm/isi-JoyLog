import express from 'express';
import cors from 'cors';
import libraryRoutes from './routes/libraryRoutes';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Modulos
app.use('/', libraryRoutes);

export default app;
