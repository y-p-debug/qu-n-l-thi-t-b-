import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

import sendEmailHandler from './api/send-email.js';
import checkOverdueHandler from './api/check-overdue.js';
import webhookStatusHandler from './api/webhook-status.js';
import configureWebhookHandler from './api/configure-webhook.js';
import testWebhookHandler from './api/test-webhook.js';
import availableAssetsHandler from './api/available-assets.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Express body parsers
app.use(express.json({ limit: '150mb' }));
app.use(express.urlencoded({ limit: '150mb', extended: true }));

// Mount Vercel Serverless Function handlers for local development parity
app.all('/api/send-email', (req, res) => sendEmailHandler(req, res));
app.all('/api/check-overdue', (req, res) => checkOverdueHandler(req, res));
app.all('/api/cron/check-overdue', (req, res) => checkOverdueHandler(req, res));
app.all('/api/webhook-status', (req, res) => webhookStatusHandler(req, res));
app.all('/api/configure-webhook', (req, res) => configureWebhookHandler(req, res));
app.all('/api/test-webhook', (req, res) => testWebhookHandler(req, res));
app.all('/api/available-assets', (req, res) => availableAssetsHandler(req, res));

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err && (err.type === 'entity.too.large' || err.status === 413)) {
    return res.status(413).json({
      ok: false,
      error: 'Tệp tải lên vượt quá dung lượng tối đa cho phép (150MB).'
    });
  }
  next(err);
});

// Setup dev server with Vite middlewares or static files for production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();

export default app;
