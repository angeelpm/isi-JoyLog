import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = process.env.PORT || 3000;

// Gateway Proxies
app.use('/api/auth', createProxyMiddleware({ target: 'http://auth-service:3001', changeOrigin: true }));
app.use('/api/library', createProxyMiddleware({ target: 'http://library-service:3002', changeOrigin: true }));

app.get('/health', (req, res) => {
    res.json({ status: 'Gateway operates normally' });
});

app.listen(PORT, () => {
    console.log(`API Gateway is running on port ${PORT}`);
});
