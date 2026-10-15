export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    const { scriptUrl, sheetName } = req.body || {};
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

    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Vercel API error /api/get-sheet-history:', error);
    return res.status(500).json({
      status: 'error',
      message: error?.message || 'Lỗi khi đọc dữ liệu từ Google Sheets',
    });
  }
}
