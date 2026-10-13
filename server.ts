import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));

  // API endpoint: Sync order rows to Google Apps Script Web App
  app.post('/api/sync-sheets', async (req, res) => {
    try {
      const { scriptUrl, payload } = req.body;
      if (!scriptUrl) {
        return res.status(400).json({ success: false, message: 'Thiếu scriptUrl' });
      }

      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
        redirect: 'follow',
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { status: 'success', raw: text };
      }

      return res.json({ success: true, ...data });
    } catch (error: any) {
      console.error('Error in /api/sync-sheets:', error);
      return res.status(500).json({
        success: false,
        message: error?.message || 'Lỗi kết nối tới Google Apps Script Web App',
      });
    }
  });

  // API endpoint: Test connection
  app.post('/api/test-sheets', async (req, res) => {
    try {
      const { scriptUrl } = req.body;
      if (!scriptUrl) {
        return res.status(400).json({ success: false, message: 'Thiếu scriptUrl' });
      }

      const response = await fetch(scriptUrl, {
        method: 'GET',
        redirect: 'follow',
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { status: 'ready', raw: text };
      }

      return res.json({ success: true, ...data });
    } catch (error: any) {
      console.error('Error testing Google Sheets URL:', error);
      return res.status(500).json({
        success: false,
        message: error?.message || 'Không thể kết nối tới URL này',
      });
    }
  });

  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
