import { OrderRowData, ProductItem } from '../types';

export function formatTelegramMessage(
  orderDate: string,
  salesRep: string,
  rows: OrderRowData[],
  products: ProductItem[],
  isTest: boolean = false
): string {
  if (isTest) {
    return `🔔 *[ĐẶT HÀNG KÊNH SỈ] KIỂM TRA KẾT NỐI*\n\n✅ Nhóm chat đã được kết nối thành công với Hệ thống Đặt hàng kênh sỉ!\n📅 Thời gian: ${new Date().toLocaleString('vi-VN')}`;
  }

  const activeProducts = products.filter(p => p.active);
  const nowTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  // Calculate totals
  const totals: Record<string, number> = {};
  activeProducts.forEach(p => {
    totals[p.id] = 0;
  });

  let lines = `🍺 *[ĐẶT HÀNG KÊNH SỈ] ĐƠN ĐẶT HÀNG MỚI*\n`;
  lines += `📅 Ngày: ${orderDate} · ${nowTime}\n`;
  lines += `👤 NV Sale: *${salesRep}*\n\n`;
  lines += `📋 *DANH SÁCH CÁC QUÁN:*\n`;

  rows.forEach((r, idx) => {
    const itemParts: string[] = [];
    activeProducts.forEach(p => {
      const q = r.quantities[p.id] || 0;
      if (q > 0) {
        itemParts.push(`${q} ${p.name}`);
        totals[p.id] = (totals[p.id] || 0) + q;
      }
    });

    const timeTag = r.deliveryTimeSlot ? ` [${r.deliveryTimeSlot}]` : '';
    const noteTag = r.notes ? ` (Note: ${r.notes})` : '';
    const batchTag = r.orderBatchNum && r.orderBatchNum > 1 ? ` ⚡ [Đợt ${r.orderBatchNum}]` : '';

    lines += `${idx + 1}. *${r.customerName}*${batchTag}: ${itemParts.join(', ')}${timeTag}${noteTag}\n`;
  });

  lines += `\n📊 *TỔNG CỘNG (${rows.length} quán):*\n`;
  const summaryParts: string[] = [];
  activeProducts.forEach(p => {
    const sum = totals[p.id] || 0;
    if (sum > 0) {
      summaryParts.push(`*${sum}* ${p.name} (${p.unit})`);
    }
  });

  lines += summaryParts.join(' · ');

  return lines;
}

export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string
): Promise<{ success: boolean; message: string }> {
  if (!botToken.trim() || !chatId.trim()) {
    return { success: false, message: 'Chưa cấu hình Telegram Bot Token hoặc Chat ID' };
  }

  // 1. Try server proxy first
  try {
    const res = await fetch('/api/send-telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        botToken: botToken.trim(),
        chatId: chatId.trim(),
        text,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.ok || data.success) {
        return { success: true, message: 'Đã gửi thông báo vào nhóm Telegram!' };
      }
    }
  } catch (proxyError) {
    console.warn('Proxy telegram failed, trying direct fetch...', proxyError);
  }

  // 2. Direct fetch fallback
  try {
    const url = `https://api.telegram.org/bot${botToken.trim()}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId.trim(),
        text,
        parse_mode: 'Markdown',
      }),
    });

    const data = await res.json();
    if (data.ok) {
      return { success: true, message: 'Đã gửi thông báo vào nhóm Telegram thành công!' };
    } else {
      return {
        success: false,
        message: `Lỗi từ Telegram: ${data.description || 'Không thể gửi tin nhắn'}`,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: `Lỗi kết nối Telegram: ${error?.message || 'Không thể gửi tin nhắn'}`,
    };
  }
}
