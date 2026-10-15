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

  // API endpoint: Sync product catalog columns to Google Sheet
  app.post('/api/sync-products', async (req, res) => {
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
      console.error('Error in /api/sync-products:', error);
      return res.status(500).json({
        success: false,
        message: error?.message || 'Lỗi đồng bộ danh mục cột tới Google Apps Script',
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

  // API endpoint: Fetch history from Google Sheets (Bypass all cache)
  app.post('/api/get-sheet-history', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    try {
      const { scriptUrl, sheetName } = req.body;
      if (!scriptUrl) {
        return res.status(400).json({ success: false, message: 'Thiếu scriptUrl' });
      }

      const cleanUrl = scriptUrl.trim();
      const targetUrl = `${cleanUrl}${cleanUrl.includes('?') ? '&' : '?'}action=getHistory&sheetName=${encodeURIComponent(sheetName || 'Đặt bia sỉ')}&_t=${Date.now()}`;

      const response = await fetch(targetUrl, {
        method: 'GET',
        redirect: 'follow',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store',
          'Pragma': 'no-cache',
        },
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { status: 'error', message: 'Không thể phân tích dữ liệu Google Sheet', raw: text };
      }

      return res.json(data);
    } catch (error: any) {
      console.error('Error in /api/get-sheet-history:', error);
      return res.status(500).json({
        status: 'error',
        message: error?.message || 'Lỗi khi đọc dữ liệu từ Google Sheets',
      });
    }
  });

  // API endpoint: Send Telegram Notification
  app.post('/api/send-telegram', async (req, res) => {
    try {
      const { botToken, chatId, text } = req.body;
      if (!botToken || !chatId || !text) {
        return res.status(400).json({ success: false, message: 'Thiếu tham số gửi Telegram' });
      }

      const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const response = await fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'Markdown',
        }),
      });

      const data = await response.json();
      return res.json(data);
    } catch (error: any) {
      console.error('Error sending telegram message:', error);
      return res.status(500).json({
        success: false,
        message: error?.message || 'Lỗi gửi tin nhắn Telegram',
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
