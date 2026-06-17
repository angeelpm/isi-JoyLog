import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
app.use(cors({
    origin: ['http://localhost:5173', 'http://frontend:5173'],
    credentials: true
}));

// Request logging (Must be before proxies so it triggers)
app.use((req, res, next) => {
    console.log(`[Gateway] ${req.method} ${req.path}`);
    next();
});

// Gateway Proxies must be declared BEFORE express.json() so it doesn't consume the body stream
app.use('/api/auth', createProxyMiddleware({
    target: 'http://auth-service:3001',
    changeOrigin: true,
    pathRewrite: { '^/api/auth': '' }
}));

app.use('/api/library', createProxyMiddleware({
    target: 'http://library-service:3002',
    changeOrigin: true,
    pathRewrite: { '^/api/library': '' }
}));

app.use('/api/ai', createProxyMiddleware({
    target: 'http://ai-service:3003',
    changeOrigin: true,
    pathRewrite: { '^/api/ai': '' }
}));

// RAWG API proxy - avoids CORS issues from frontend
app.use('/api/games', createProxyMiddleware({
    target: 'https://api.rawg.io/api',
    changeOrigin: true,
    pathRewrite: (path, req) => {
        let newPath = path.replace(/^\/api\/games/, '');
        const rawgKey = process.env.RAWG_API_KEY || 'b362eb04cebe47c5bc5483a9de06c429';
        if (rawgKey) {
            const separator = newPath.includes('?') ? '&' : '?';
            newPath += `${separator}key=${rawgKey}`;
        }
        return newPath;
    }
}));



app.get('/health', (req, res) => {
    res.json({ status: 'Gateway operates normally' });
});

app.listen(PORT, () => {
    console.log(`API Gateway is running on port ${PORT}`);
});
