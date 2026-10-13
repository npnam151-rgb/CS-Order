import { ProductItem, OrderRowData } from '../types';

export const APPS_SCRIPT_TEMPLATE = `/**
 * Google Apps Script - Tự động ghi nhận Đơn Đặt Hàng Bia Hơi
 * Hướng dẫn:
 * 1. Mở Google Sheet của bạn -> Vào menu Tiện ích mở rộng (Extensions) -> Apps Script
 * 2. Xóa hết code mặc định, dán toàn bộ đoạn mã này vào.
 * 3. Nhấn nút "Triển khai" (Deploy) -> "Tùy chọn triển khai mới" (New deployment)
 * 4. Loại: "Ứng dụng web" (Web app)
 * 5. Ai có quyền truy cập (Who has access): Chọn "Bất kỳ ai" (Anyone)
 * 6. Nhấn "Triển khai" (Deploy) và sao chép URL Ứng dụng web dán vào App đặt hàng.
 */

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ready",
    message: "Google Apps Script Web App đang hoạt động tốt!",
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  // Đợi tối đa 30s để tránh xung đột ghi đè khi nhiều Sale gửi cùng lúc
  var success = lock.tryLock(30000);
  if (!success) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Hệ thống đang bận, vui lòng thử lại sau giây lát!"
    })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var contents = e.postData.contents;
    var data = JSON.parse(contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = data.sheetName || "Đặt Hàng";
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }

    // Nếu trang tính chưa có tiêu đề, tạo hàng tiêu đề chuẩn
    if (sheet.getLastRow() === 0) {
      var headers = ["Ngày đặt hàng", "NV Sale đặt đơn", "Khách hàng"];
      if (data.productHeaders && data.productHeaders.length > 0) {
        headers = headers.concat(data.productHeaders);
      } else {
        headers = headers.concat(["Bom 50l (bom)", "Bom 30l (bom)", "Keg1L (két)"]);
      }
      headers.push("Ghi chú", "Thời gian ghi nhận");
      sheet.appendRow(headers);
      
      // Định dạng dòng tiêu đề
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#FEF3C7"); // Màu vàng bia nhạt
      headerRange.setFontColor("#78350F");
      sheet.setFrozenRows(1);
    }

    // Ghi từng dòng đơn hàng
    if (data.rows && data.rows.length > 0) {
      for (var i = 0; i < data.rows.length; i++) {
        sheet.appendRow(data.rows[i]);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      rowsCount: data.rows ? data.rows.length : 0,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
`;

export interface SyncPayload {
  sheetName: string;
  orderDate: string;
  salesRep: string;
  productHeaders: string[]; // e.g. ["Bom 50l (bom)", "Bom 30l (bom)", "Keg1L (két)"]
  rows: (string | number)[][]; // each row matches headers
}

export function buildSyncPayload(
  orderDate: string,
  salesRep: string,
  products: ProductItem[],
  orderRows: OrderRowData[],
  sheetName: string = 'Đặt Hàng'
): SyncPayload {
  // Only include active products
  const activeProducts = products.filter(p => p.active);
  const productHeaders = activeProducts.map(p => `${p.name} (${p.unit})`);

  // Filter rows where at least one product has quantity > 0
  const rowsToSubmit: (string | number)[][] = [];
  const nowStr = new Date().toLocaleString('vi-VN');

  for (const row of orderRows) {
    const hasAnyQty = activeProducts.some(p => (row.quantities[p.id] || 0) > 0);
    if (!hasAnyQty) continue;

    const rowArray: (string | number)[] = [
      orderDate,
      salesRep,
      row.customerName,
    ];

    for (const prod of activeProducts) {
      rowArray.push(row.quantities[prod.id] || 0);
    }

    rowArray.push(row.notes || '');
    rowArray.push(nowStr);

    rowsToSubmit.push(rowArray);
  }

  return {
    sheetName,
    orderDate,
    salesRep,
    productHeaders,
    rows: rowsToSubmit,
  };
}

export async function sendOrderToGoogleSheets(
  scriptUrl: string,
  payload: SyncPayload
): Promise<{ success: boolean; message: string; rowsCount?: number }> {
  if (!scriptUrl || !scriptUrl.trim()) {
    return {
      success: false,
      message: 'Chưa cấu hình URL Google Apps Script Web App. Vui lòng vào Cài đặt để dán URL.',
    };
  }

  const cleanUrl = scriptUrl.trim();

  // 1. Try server-side proxy first (bypasses browser CORS issues completely)
  try {
    const res = await fetch('/api/sync-sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scriptUrl: cleanUrl, payload }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success' || data.success) {
        return {
          success: true,
          message: `Đã lưu thành công ${payload.rows.length} dòng vào Google Sheet!`,
          rowsCount: payload.rows.length,
        };
      } else if (data.message) {
        return { success: false, message: data.message };
      }
    }
  } catch (proxyError) {
    console.warn('Server proxy failed, trying direct browser fetch...', proxyError);
  }

  // 2. Direct browser fetch with text/plain to avoid CORS preflight check
  try {
    const res = await fetch(cleanUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const json = await res.json();
      return {
        success: true,
        message: `Đã lưu thành công ${payload.rows.length} dòng vào Google Sheet!`,
        rowsCount: json.rowsCount || payload.rows.length,
      };
    }
  } catch (directError) {
    console.warn('Direct fetch with JSON parse failed, trying no-cors mode...', directError);
  }

  // 3. Fallback no-cors mode (fire and assume success if network permitted)
  try {
    await fetch(cleanUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });

    return {
      success: true,
      message: `Đã gửi ${payload.rows.length} dòng tới Google Sheet (Chế độ chuyển tiếp). Vui lòng kiểm tra trang tính.`,
      rowsCount: payload.rows.length,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Lỗi kết nối tới Google Sheets: ${err?.message || 'Không thể gửi dữ liệu'}`,
    };
  }
}

export async function testConnection(scriptUrl: string): Promise<{ success: boolean; message: string }> {
  if (!scriptUrl || !scriptUrl.trim()) {
    return { success: false, message: 'Vui lòng nhập URL Google Apps Script.' };
  }

  try {
    const res = await fetch('/api/test-sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scriptUrl: scriptUrl.trim() }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.status === 'ready' || data.success) {
        return { success: true, message: 'Kết nối thành công! Google Apps Script đã sẵn sàng.' };
      }
    }
  } catch {
    // fallback test
  }

  try {
    const res = await fetch(scriptUrl.trim());
    if (res.ok) {
      return { success: true, message: 'Kết nối thành công tới Web App!' };
    }
  } catch {
    // ignore
  }

  return {
    success: false,
    message: 'Không thể kết nối tới URL này. Hãy đảm bảo bạn đã chọn quyền truy cập là "Anyone" (Bất kỳ ai) khi Triển khai.',
  };
}

export function exportToCSV(
  orderDate: string,
  salesRep: string,
  products: ProductItem[],
  orderRows: OrderRowData[]
): void {
  const activeProducts = products.filter(p => p.active);
  const headers = ['Ngày đặt hàng', 'NV Sale đặt đơn', 'Khách hàng', ...activeProducts.map(p => `${p.name} (${p.unit})`), 'Ghi chú'];

  const rows: string[][] = [headers];

  for (const row of orderRows) {
    const hasAnyQty = activeProducts.some(p => (row.quantities[p.id] || 0) > 0);
    if (!hasAnyQty) continue;

    const rowData: string[] = [
      `"${orderDate}"`,
      `"${salesRep.replace(/"/g, '""')}"`,
      `"${row.customerName.replace(/"/g, '""')}"`,
    ];

    for (const prod of activeProducts) {
      rowData.push(String(row.quantities[prod.id] || 0));
    }

    rowData.push(`"${(row.notes || '').replace(/"/g, '""')}"`);
    rows.push(rowData);
  }

  const csvContent = '\uFEFF' + rows.map(r => r.join(',')).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `DonHangBia_${orderDate}_${salesRep.replace(/\s+/g, '_')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
