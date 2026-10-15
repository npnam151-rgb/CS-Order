export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const { botToken, chatId, text } = req.body || {};
    if (!botToken || !chatId || !text) {
      return res.status(400).json({ success: false, message: 'Thiếu botToken, chatId hoặc text' });
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
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Vercel API error /api/send-telegram:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Lỗi gửi tin nhắn Telegram',
    });
  }
}
