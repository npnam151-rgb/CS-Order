import { Customer, ProductItem, OrderRowData } from '../types';

export const APPS_SCRIPT_TEMPLATE = `/**
 * Google Apps Script - CS Order (Bản chuẩn 100% - Chống đè tên NV & Tự động chèn cột mặt hàng mới)
 * Tên trang tính mặc định: Đặt bia sỉ
 * 
 * NGUYÊN TẮC CỐT LÕI:
 * - Dòng 1: Dòng công thức SUM tính tổng (Script tự động copy công thức =SUM(...) khi thêm cột mới).
 * - Dòng 2: Dòng tiêu đề:
 *     Cột 1 (A): Ngày đặt hàng
 *     Cột 2 (B): NV Sale đặt đơn (TUYỆT ĐỐI BẢO TOÀN, KHÔNG BAO GIỜ BỊ ĐÈ BỞI SỐ LƯỢNG MẶT HÀNG)
 *     Cột 3 (C): Khách hàng
 *     Cột 4 trở đi (D, E, F, G...): Các mặt hàng bia (Bom 50l, Bom 30l, Keg1L, Bom 20L...)
 *     Cột cuối cùng: Thời gian gửi
 * - Khi thêm sản phẩm mới (từ Admin hoặc khi lên đơn): Script tự động chèn cột mới ngay trước cột "Thời gian gửi",
 *   thiết lập màu nền vàng nhạt, in đậm và điền sẵn công thức SUM ở Dòng 1!
 */

function doGet(e) {
  var params = e ? e.parameter : {};
  var action = params ? params.action : "";
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = (params && params.sheetName) ? params.sheetName : "Đặt bia sỉ";
  var sheet = ss.getSheetByName(sheetName) || ss.getActiveSheet();

  // 1. Yêu cầu lấy toàn bộ lịch sử (cho Admin xem đơn từ tất cả điện thoại/máy tính)
  if (action === "getHistory") {
    try {
      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();

      if (lastRow < 2) {
        return ContentService.createTextOutput(JSON.stringify({
          status: "success",
          headers: [],
          records: [],
          total: 0
        })).setMimeType(ContentService.MimeType.JSON);
      }

      // Đọc tiêu đề dòng 2
      var headers = sheet.getRange(2, 1, 1, Math.max(lastCol, 1)).getValues()[0];

      var records = [];
      if (lastRow >= 3) {
        var dataRange = sheet.getRange(3, 1, lastRow - 2, lastCol).getValues();
        for (var i = 0; i < dataRange.length; i++) {
          var row = dataRange[i];
          var orderDate = row[0] ? String(row[0]).trim() : "";
          var customer = row[2] ? String(row[2]).trim() : "";
          
          // Bỏ qua dòng trống hoàn toàn
          if (!orderDate && !customer) continue;

          // Chuẩn hóa định dạng ngày
          if (row[0] instanceof Date) {
            var d = row[0];
            var yyyy = d.getFullYear();
            var mm = String(d.getMonth() + 1).padStart(2, '0');
            var dd = String(d.getDate()).padStart(2, '0');
            orderDate = yyyy + "-" + mm + "-" + dd;
          }

          records.push({
            rowIndex: i + 3,
            orderDate: orderDate,
            salesRep: row[1] ? String(row[1]).trim() : "",
            customerName: customer,
            values: row
          });
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        sheetName: sheet.getName(),
        headers: headers,
        records: records,
        total: records.length,
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);

    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: err.toString()
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  // Mặc định: kiểm tra kết nối Web App
  return ContentService.createTextOutput(JSON.stringify({
    status: "ready",
    message: "Google Apps Script Web App đang hoạt động tốt!",
    sheetName: sheet.getName(),
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  var success = lock.tryLock(30000);
  if (!success) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Hệ thống đang bận ghi đơn, vui lòng thử lại sau giây lát!"
    })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var contents = e.postData.contents;
    var data = JSON.parse(contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = data.sheetName || "Đặt bia sỉ";
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }

    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();

    // 1. Khởi tạo cấu trúc bảng nếu sheet mới chưa có tiêu đề ở dòng 2
    if (lastRow < 2) {
      var initialHeaders = ["Ngày đặt hàng", "NV Sale đặt đơn", "Khách hàng", "Bom 50l (bom)", "Bom 30l (bom)", "Keg1L (két)", "Thời gian gửi"];
      sheet.getRange(2, 1, 1, initialHeaders.length).setValues([initialHeaders]);
      sheet.getRange(2, 1, 1, initialHeaders.length).setFontWeight("bold").setBackground("#FEF3C7").setFontColor("#78350F");
      // Dòng 1 tính tổng cho các cột bia ban đầu
      sheet.getRange("D1").setFormula("=SUM(D3:D)");
      sheet.getRange("E1").setFormula("=SUM(E3:E)");
      sheet.getRange("F1").setFormula("=SUM(F3:F)");
      sheet.getRange("D1:F1").setFontWeight("bold").setFontColor("#DC2626");
      lastCol = initialHeaders.length;
    }

    function cleanStr(s) {
      return String(s || "").trim().toLowerCase();
    }

    // Helper: Chuyển đổi số thứ tự cột sang chữ cái (1 -> A, 4 -> D, 27 -> AA,...)
    function getColumnLetter(colIndex) {
      var temp, letter = '';
      while (colIndex > 0) {
        temp = (colIndex - 1) % 26;
        letter = String.fromCharCode(temp + 65) + letter;
        colIndex = Math.floor((colIndex - temp - 1) / 26);
      }
      return letter;
    }

    // Đọc danh sách tiêu đề dòng 2 hiện tại
    lastCol = Math.max(sheet.getLastColumn(), 6);
    var headerRowValues = sheet.getRange(2, 1, 1, lastCol).getValues()[0];

    // Tìm vị trí cột "Thời gian gửi"
    var timeColIndex = 0;
    for (var c = 0; c < headerRowValues.length; c++) {
      var hClean = cleanStr(headerRowValues[c]);
      if (hClean.indexOf("thời gian") !== -1 || hClean.indexOf("time") !== -1) {
        timeColIndex = c + 1;
        break;
      }
    }

    if (timeColIndex === 0) {
      timeColIndex = headerRowValues.length + 1;
      sheet.getRange(2, timeColIndex).setValue("Thời gian gửi").setFontWeight("bold").setBackground("#FEF3C7").setHorizontalAlignment("center");
      lastCol = timeColIndex;
    }

    // Hàm đảm bảo cột sản phẩm tồn tại trước cột thời gian gửi
    function ensureProductColumn(prodName, prodUnit) {
      var fullTitle = prodName + (prodUnit ? " (" + prodUnit + ")" : "");
      var colKey = cleanStr(fullTitle);
      var nameKey = cleanStr(prodName);

      // Đọc lại tiêu đề hiện tại của dòng 2
      var curColCount = Math.max(sheet.getLastColumn(), timeColIndex);
      var curHeaders = sheet.getRange(2, 1, 1, curColCount).getValues()[0];

      // Tìm trong các cột bia (CỘT 4 TRỞ ĐI, và trước timeColIndex)
      for (var col = 4; col <= curColCount; col++) {
        if (col === timeColIndex) continue;
        var headerVal = cleanStr(curHeaders[col - 1]);
        if (!headerVal) continue;
        if (headerVal === colKey || headerVal === nameKey) {
          return col; // Cột đã tồn tại
        }
      }

      // Kiểm tra xem có cột trống ngay trước timeColIndex không
      var prevCol = timeColIndex - 1;
      var prevHeader = (prevCol >= 4 && prevCol <= curHeaders.length) ? cleanStr(curHeaders[prevCol - 1]) : "has_data";

      if (prevCol >= 4 && !prevHeader) {
        // Tận dụng cột trống có sẵn
        sheet.getRange(2, prevCol).setValue(fullTitle)
          .setFontWeight("bold")
          .setBackground("#FEF3C7")
          .setFontColor("#78350F")
          .setHorizontalAlignment("center");

        var colLet = getColumnLetter(prevCol);
        sheet.getRange(1, prevCol).setFormula("=SUM(" + colLet + "3:" + colLet + ")")
          .setFontWeight("bold")
          .setFontColor("#DC2626")
          .setHorizontalAlignment("center");

        return prevCol;
      }

      // Chèn cột mới ngay trước cột thời gian gửi
      sheet.insertColumnBefore(timeColIndex);
      var newCol = timeColIndex;

      sheet.getRange(2, newCol).setValue(fullTitle)
        .setFontWeight("bold")
        .setBackground("#FEF3C7")
        .setFontColor("#78350F")
        .setHorizontalAlignment("center");

      var newColLet = getColumnLetter(newCol);
      sheet.getRange(1, newCol).setFormula("=SUM(" + newColLet + "3:" + newColLet + ")")
        .setFontWeight("bold")
        .setFontColor("#DC2626")
        .setHorizontalAlignment("center");

      timeColIndex++; // Dịch cột thời gian sang phải
      return newCol;
    }

    // 2. XỬ LÝ LỆNH ĐỒNG BỘ CỘT TỪ ADMIN (Khi thêm/sửa mặt hàng trên App)
    if (data.action === "syncColumns" || data.action === "syncProducts") {
      var syncedList = [];
      if (data.products && data.products.length > 0) {
        for (var p = 0; p < data.products.length; p++) {
          var pItem = data.products[p];
          if (pItem.active !== false) {
            var colIdx = ensureProductColumn(pItem.name, pItem.unit);
            syncedList.push({ id: pItem.id, name: pItem.name, column: colIdx });
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Đã đồng bộ cột mặt hàng vào Google Sheet thành công!",
        syncedProducts: syncedList,
        totalColumns: sheet.getLastColumn(),
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. MAPPING CỘT CHO TẤT CẢ SẢN PHẨM TRONG ĐƠN HÀNG
    var productCols = {};
    if (data.products && data.products.length > 0) {
      for (var p = 0; p < data.products.length; p++) {
        var prod = data.products[p];
        var mappedCol = ensureProductColumn(prod.name, prod.unit);
        productCols[prod.id] = mappedCol;
      }
    }

    // 4. GHI DỮ LIỆU ĐƠN HÀNG VÀO DÒNG MỚI
    var currentLastRow = Math.max(sheet.getLastRow(), 2);
    var startInsertRow = currentLastRow + 1;
    var finalColCount = sheet.getLastColumn();
    var rowsToWrite = [];
    var nowTimestamp = Utilities.formatDate(new Date(), "GMT+7", "HH:mm:ss dd/MM/yyyy");

    if (data.orderRows && data.orderRows.length > 0) {
      for (var r = 0; r < data.orderRows.length; r++) {
        var ord = data.orderRows[r];
        var rowArr = new Array(finalColCount);
        for (var k = 0; k < finalColCount; k++) {
          rowArr[k] = "";
        }

        // CỘT 1 (A): Ngày đặt hàng
        rowArr[0] = data.orderDate || "";

        // CỘT 2 (B): NV Sale đặt đơn (BẢO TOÀN TÊN NHÂN VIÊN, TUYỆT ĐỐI KHÔNG BỊ ĐÈ!)
        rowArr[1] = String(data.salesRep || "").trim();

        // CỘT 3 (C): Khách hàng (Tên quán)
        rowArr[2] = String(ord.customerName || "").trim();

        // CÁC CỘT SẢN PHẨM (CHỈ ĐƯỢC GHI VÀO CỘT >= 4 VÀ KHÁC timeColIndex!)
        if (ord.quantities) {
          for (var pId in ord.quantities) {
            var targetCol = productCols[pId];
            var qty = Number(ord.quantities[pId]);
            // RÀNG BUỘC BẢO MẬT: targetCol PHẢI >= 4 để bảo vệ Cột 1, 2, 3
            if (targetCol && targetCol >= 4 && targetCol !== timeColIndex && targetCol <= finalColCount) {
              rowArr[targetCol - 1] = isNaN(qty) ? 0 : qty;
            }
          }
        }

        // CỘT THỜI GIAN GỬI
        if (timeColIndex && timeColIndex <= finalColCount) {
          rowArr[timeColIndex - 1] = nowTimestamp;
        }

        rowsToWrite.push(rowArr);
      }
    }

    if (rowsToWrite.length > 0) {
      sheet.getRange(startInsertRow, 1, rowsToWrite.length, finalColCount).setValues(rowsToWrite);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      rowsCount: rowsToWrite.length,
      startRow: startInsertRow,
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
  action?: string;
  sheetName: string;
  orderDate: string;
  salesRep: string;
  products: { id: string; name: string; unit: string; active?: boolean }[];
  orderRows: {
    customerId: string;
    customerName: string;
    quantities: Record<string, number>;
    notes?: string;
  }[];
  productHeaders: string[];
  rows: (string | number)[][] ;
}

export function buildSyncPayload(
  orderDate: string,
  salesRep: string,
  products: ProductItem[],
  orderRows: OrderRowData[],
  sheetName: string = 'Đặt bia sỉ'
): SyncPayload {
  const activeProducts = products.filter(p => p.active);
  const productHeaders = activeProducts.map(p => `${p.name} (${p.unit})`);

  // Filter rows where at least one product has quantity > 0
  const validOrderRows: OrderRowData[] = [];
  const rowsToSubmit: (string | number)[][] = [];
  const nowStr = new Date().toLocaleString('vi-VN');

  for (const row of orderRows) {
    const hasAnyQty = activeProducts.some(p => (row.quantities[p.id] || 0) > 0);
    if (!hasAnyQty) continue;

    validOrderRows.push(row);

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
    sheetName: sheetName || 'Đặt bia sỉ',
    orderDate,
    salesRep: String(salesRep || '').trim(),
    products: activeProducts.map(p => ({ id: p.id, name: p.name, unit: p.unit })),
    orderRows: validOrderRows.map(r => ({
      customerId: r.customerId,
      customerName: r.customerName,
      quantities: r.quantities,
      notes: r.notes,
    })),
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
      message: 'Chưa cấu hình URL Google Apps Script Web App.',
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
          message: `Đã lưu thành công ${payload.orderRows.length} dòng vào Google Sheet!`,
          rowsCount: payload.orderRows.length,
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
        message: `Đã lưu thành công ${payload.orderRows.length} dòng vào Google Sheet!`,
        rowsCount: json.rowsCount || payload.orderRows.length,
      };
    }
  } catch (directError) {
    console.warn('Direct fetch with JSON parse failed, trying no-cors mode...', directError);
  }

  // 3. Fallback no-cors mode
  try {
    await fetch(cleanUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });

    return {
      success: true,
      message: `Đã gửi ${payload.orderRows.length} dòng tới Google Sheet (Chế độ chuyển tiếp). Vui lòng kiểm tra trang tính.`,
      rowsCount: payload.orderRows.length,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Lỗi kết nối tới Google Sheets: ${err?.message || 'Không thể gửi dữ liệu'}`,
    };
  }
}

/**
 * Sync products list directly to Google Sheet so columns are created immediately
 */
export async function syncProductsToGoogleSheets(
  scriptUrl: string,
  sheetName: string = 'Đặt bia sỉ',
  products: ProductItem[]
): Promise<{ success: boolean; message: string }> {
  if (!scriptUrl || !scriptUrl.trim()) {
    return { success: false, message: 'Chưa cấu hình URL Google Sheets.' };
  }

  const cleanUrl = scriptUrl.trim();
  const payload = {
    action: 'syncColumns',
    sheetName: sheetName || 'Đặt bia sỉ',
    products: products.map(p => ({ id: p.id, name: p.name, unit: p.unit, active: p.active })),
  };

  try {
    const res = await fetch('/api/sync-products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scriptUrl: cleanUrl, payload }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success' || data.success) {
        return { success: true, message: data.message || 'Đồng bộ cột sản phẩm vào Google Sheet thành công!' };
      }
    }
  } catch (proxyErr) {
    console.warn('Proxy sync-products failed, trying direct fetch...', proxyErr);
  }

  try {
    const res = await fetch(cleanUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      return { success: true, message: data.message || 'Đã đồng bộ cột mặt hàng vào Google Sheet!' };
    }
  } catch {
    // fallback
  }

  return { success: false, message: 'Không thể đồng bộ danh mục cột tới Google Sheet. Vui lòng kiểm tra kết nối.' };
}

export interface SheetHistoryRecord {
  rowIndex: number;
  orderDate: string;
  salesRep: string;
  customerName: string;
  quantities: Record<string, number>;
  timeSent: string;
  rawValues: (string | number)[];
}

export async function fetchSheetHistory(
  scriptUrl: string,
  sheetName: string = 'Đặt bia sỉ'
): Promise<{
  success: boolean;
  headers: string[];
  records: SheetHistoryRecord[];
  message?: string;
  isLegacyScript?: boolean;
}> {
  if (!scriptUrl || !scriptUrl.trim()) {
    return { success: false, headers: [], records: [], message: 'Chưa cấu hình URL Google Sheets.' };
  }

  const cleanUrl = scriptUrl.trim();
  const cleanSheetName = sheetName || 'Đặt bia sỉ';

  // 1. Try server-side proxy
  try {
    const res = await fetch('/api/get-sheet-history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      cache: 'no-store',
      body: JSON.stringify({ scriptUrl: cleanUrl, sheetName: cleanSheetName }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success' && Array.isArray(data.records)) {
        return parseSheetHistoryResponse(data.headers || [], data.records);
      }
      if (data.status === 'ready') {
        return {
          success: false,
          headers: [],
          records: [],
          isLegacyScript: true,
          message: 'Google Apps Script hiện tại chưa cập nhật tính năng lấy lịch sử. Vui lòng copy mã Apps Script mới trong mục Cài đặt và dán vào Google Sheet để kích hoạt.',
        };
      }
    }
  } catch (proxyError) {
    console.warn('Proxy get-sheet-history failed, trying direct fetch...', proxyError);
  }

  // 2. Direct fetch with ?action=getHistory & cache buster
  try {
    const directUrl = `${cleanUrl}${cleanUrl.includes('?') ? '&' : '?'}action=getHistory&sheetName=${encodeURIComponent(cleanSheetName)}&_t=${Date.now()}`;
    const res = await fetch(directUrl, {
      method: 'GET',
      redirect: 'follow',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success' && Array.isArray(data.records)) {
        return parseSheetHistoryResponse(data.headers || [], data.records);
      }
      if (data.status === 'ready') {
        return {
          success: false,
          headers: [],
          records: [],
          isLegacyScript: true,
          message: 'Google Apps Script trên trang tính cần được cập nhật bản mã mới để kích hoạt tính năng đọc toàn bộ đơn hàng.',
        };
      }
    }
  } catch (directError: any) {
    console.warn('Direct fetch failed:', directError);
  }

  return {
    success: false,
    headers: [],
    records: [],
    message: 'Không thể kết nối tới Google Sheet để lấy dữ liệu.',
  };
}

function parseSheetHistoryResponse(headers: string[], records: any[]): {
  success: boolean;
  headers: string[];
  records: SheetHistoryRecord[];
} {
  // Identify product columns (between column 3 and last column)
  const parsedRecords: SheetHistoryRecord[] = records.map((r, idx) => {
    const rowValues = r.values || [];
    const quantities: Record<string, number> = {};

    // Map each column to header
    headers.forEach((h, colIdx) => {
      const hLower = String(h).trim().toLowerCase();
      if (
        colIdx >= 3 &&
        !hLower.includes('thời gian') &&
        !hLower.includes('ghi chú') &&
        !hLower.includes('time') &&
        !hLower.includes('note')
      ) {
        const val = Number(rowValues[colIdx]);
        if (!isNaN(val) && val > 0) {
          quantities[h] = val;
        }
      }
    });

    // Time sent column
    let timeSent = '';
    const timeColIdx = headers.findIndex(h => String(h).toLowerCase().includes('thời gian') || String(h).toLowerCase().includes('time'));
    if (timeColIdx !== -1 && rowValues[timeColIdx]) {
      timeSent = String(rowValues[timeColIdx]);
    }

    return {
      rowIndex: r.rowIndex || idx + 3,
      orderDate: r.orderDate || String(rowValues[0] || ''),
      salesRep: r.salesRep || String(rowValues[1] || ''),
      customerName: r.customerName || String(rowValues[2] || ''),
      quantities,
      timeSent,
      rawValues: rowValues,
    };
  });

  return {
    success: true,
    headers,
    records: parsedRecords,
  };
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
        return { success: true, message: 'Kết nối thành công! Google Apps Script Web App đã sẵn sàng.' };
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
  const headers = ['Ngày đặt hàng', 'NV Sale đặt đơn', 'Khách hàng', ...activeProducts.map(p => `${p.name} (${p.unit})`), 'Thời gian gửi'];

  const rows: string[][] = [headers];
  const nowStr = new Date().toLocaleString('vi-VN');

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

    rowData.push(`"${nowStr}"`);
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

/**
 * Đọc trực tiếp danh sách khách hàng từ trang tính "Đặt Hàng" trong cùng file Google Spreadsheet
 */
export async function fetchCustomersFromSheet(
  scriptUrl: string,
  sheetName: string = 'Đặt Hàng'
): Promise<{ success: boolean; customers: Customer[]; message: string }> {
  try {
    if (!scriptUrl || !scriptUrl.trim()) {
      return { success: false, customers: [], message: 'Chưa cấu hình URL Google Apps Script.' };
    }

    const cleanUrl = scriptUrl.trim();
    const targetUrl = `${cleanUrl}?action=getHistory&sheetName=${encodeURIComponent(sheetName)}`;

    let data: any = null;
    try {
      const res = await fetch(targetUrl);
      data = await res.json();
    } catch {
      // Fallback qua proxy route
      const proxyRes = await fetch(`/api/sync-sheets?action=getHistory&sheetName=${encodeURIComponent(sheetName)}`);
      data = await proxyRes.json();
    }

    if (!data || data.status !== 'success' || !Array.isArray(data.records)) {
      return {
        success: false,
        customers: [],
        message: data?.message || `Không thể đọc dữ liệu từ sheet "${sheetName}".`,
      };
    }

    const customers: Customer[] = [];
    data.records.forEach((r: any, idx: number) => {
      const vals = r.values || [];
      const stt = vals[0];
      const code = vals[1] !== undefined ? String(vals[1]).trim() : '';
      const name = vals[2] !== undefined ? String(vals[2]).trim() : '';

      // Bỏ qua dòng tiêu đề nếu lọt vào hoặc tên rỗng
      if (name && name.toLowerCase() !== 'tên kh' && name.toLowerCase() !== 'ten kh') {
        customers.push({
          id: `c_${code || idx + 1}`,
          code: code || undefined,
          name: name,
          active: true,
          orderIndex: Number(stt) || (idx + 1),
        });
      }
    });

    return {
      success: true,
      customers,
      message: `Đã đồng bộ thành công ${customers.length} quán từ sheet "${sheetName}".`,
    };
  } catch (err: any) {
    return {
      success: false,
      customers: [],
      message: `Lỗi kết nối đồng bộ: ${err?.message || err}`,
    };
  }
}

