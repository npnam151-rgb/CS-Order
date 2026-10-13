export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const { scriptUrl, payload } = req.body || {};
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

    return res.status(200).json({ success: true, ...data });
  } catch (error: any) {
    console.error('Vercel API error /api/sync-sheets:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Lỗi kết nối tới Google Apps Script',
    });
  }
}
