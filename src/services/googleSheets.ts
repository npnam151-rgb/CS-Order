import { ProductItem, OrderRowData } from '../types';

export const APPS_SCRIPT_TEMPLATE = `/**
 * Google Apps Script - CS Order (Hỗ trợ đọc lịch sử toàn hệ thống & Mapping cột động theo Dòng 2)
 * Tên trang tính mặc định: Đặt bia sỉ
 * 
 * LƯU Ý QUAN TRỌNG:
 * - Dòng 1: Dùng để tính tổng bằng công thức Excel/Sheets (Script KHÔNG BAO GIỜ chạm vào Dòng 1).
 * - Dòng 2: Dòng tiêu đề: [Ngày đặt hàng, NV Sale đặt đơn, Khách hàng, Bom 50l (bom), Bom 30l (bom), Keg1L (két), ..., Thời gian gửi].
 * - Dòng 3 trở đi: Dữ liệu các đơn hàng được ghi nhận.
 * - Tự động thêm cột mới trước cột "Thời gian gửi" nếu bạn thêm mặt hàng mới trên App!
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

    // Nếu sheet mới chưa có tiêu đề ở dòng 2
    if (lastRow < 2) {
      var initialHeaders = ["Ngày đặt hàng", "NV Sale đặt đơn", "Khách hàng", "Bom 50l (bom)", "Bom 30l (bom)", "Keg1L (két)", "Thời gian gửi"];
      sheet.getRange(2, 1, 1, initialHeaders.length).setValues([initialHeaders]);
      sheet.getRange(2, 1, 1, initialHeaders.length).setFontWeight("bold").setBackground("#FEF3C7").setFontColor("#78350F");
      lastCol = initialHeaders.length;
    }

    // 1. ĐỌC DÒNG 2 ĐỂ TẠO MAPPING CỘT DỰA VÀO TÊN TIÊU ĐỀ
    lastCol = Math.max(sheet.getLastColumn(), 6);
    var headerRowValues = sheet.getRange(2, 1, 1, lastCol).getValues()[0];

    var headerMap = {};
    for (var c = 0; c < headerRowValues.length; c++) {
      var hText = String(headerRowValues[c] || "").trim().toLowerCase();
      if (hText) {
        headerMap[hText] = c + 1; // 1-based column index
      }
    }

    // Xác định cột "Thời gian gửi"
    var timeColIndex = headerMap["thời gian gửi"] || headerMap["thời gian"] || headerMap["time"] || 0;
    if (timeColIndex === 0) {
      timeColIndex = headerRowValues.length + 1;
      sheet.getRange(2, timeColIndex).setValue("Thời gian gửi").setFontWeight("bold");
      headerMap["thời gian gửi"] = timeColIndex;
      lastCol = timeColIndex;
    }

    // 2. MAPPING SẢN PHẨM & TỰ ĐỘNG THÊM CỘT NẾU CÓ MẶT HÀNG MỚI
    var productCols = {};
    if (data.products && data.products.length > 0) {
      for (var p = 0; p < data.products.length; p++) {
        var prod = data.products[p];
        var colName = prod.name + " (" + prod.unit + ")";
        var colKey = colName.trim().toLowerCase();
        var simpleKey = prod.name.trim().toLowerCase();

        var matchedCol = headerMap[colKey];
        if (!matchedCol) {
          for (var h in headerMap) {
            if (h.indexOf(simpleKey) !== -1) {
              matchedCol = headerMap[h];
              break;
            }
          }
        }

        // Nếu cột chưa có trên dòng 2: Chèn cột mới trước cột "Thời gian gửi"
        if (!matchedCol) {
          sheet.insertColumnBefore(timeColIndex);
          sheet.getRange(2, timeColIndex).setValue(colName).setFontWeight("bold").setBackground("#FEF3C7");
          matchedCol = timeColIndex;
          timeColIndex++;
          headerMap["thời gian gửi"] = timeColIndex;
        }

        productCols[prod.id] = matchedCol;
        productCols[colName] = matchedCol;
      }
    }

    // 3. TÌM DÒNG TRỐNG TIẾP THEO (SAU DÒNG 2)
    var currentLastRow = Math.max(sheet.getLastRow(), 2);
    var startInsertRow = currentLastRow + 1;

    // 4. GHI DỮ LIỆU ĐÚNG THEO CỘT DÒNG 2
    var finalColCount = sheet.getLastColumn();
    var rowsToWrite = [];
    var nowTimestamp = Utilities.formatDate(new Date(), "GMT+7", "HH:mm:ss dd/MM/yyyy");

    var dateCol = headerMap["ngày đặt hàng"] || 1;
    var repCol = headerMap["nv sale đặt đơn"] || headerMap["nv sale"] || 2;
    var custCol = headerMap["khách hàng"] || 3;

    if (data.orderRows && data.orderRows.length > 0) {
      for (var r = 0; r < data.orderRows.length; r++) {
        var ord = data.orderRows[r];
        var rowArr = new Array(finalColCount);
        for (var k = 0; k < finalColCount; k++) {
          rowArr[k] = "";
        }

        rowArr[dateCol - 1] = data.orderDate || "";
        rowArr[repCol - 1] = data.salesRep || "";
        rowArr[custCol - 1] = ord.customerName || "";

        // Điền số lượng từng mặt hàng
        if (ord.quantities) {
          for (var pId in ord.quantities) {
            var targetCol = productCols[pId];
            if (targetCol && targetCol <= finalColCount) {
              rowArr[targetCol - 1] = ord.quantities[pId] || 0;
            }
          }
        }

        // Ghi thời gian gửi
        if (timeColIndex && timeColIndex <= finalColCount) {
          rowArr[timeColIndex - 1] = nowTimestamp;
        }

        rowsToWrite.push(rowArr);
      }
    } else if (data.rows && data.rows.length > 0) {
      // Hỗ trợ ngược cho định dạng mảng dòng cũ
      for (var j = 0; j < data.rows.length; j++) {
        sheet.appendRow(data.rows[j]);
      }
    }

    if (rowsToWrite.length > 0) {
      sheet.getRange(startInsertRow, 1, rowsToWrite.length, finalColCount).setValues(rowsToWrite);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      rowsCount: rowsToWrite.length || (data.rows ? data.rows.length : 0),
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
  sheetName: string;
  orderDate: string;
  salesRep: string;
  products: { id: string; name: string; unit: string }[];
  orderRows: {
    customerId: string;
    customerName: string;
    quantities: Record<string, number>;
    notes?: string;
  }[];
  productHeaders: string[];
  rows: (string | number)[][];
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
    salesRep,
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
      headers: { 'Content-Type': 'application/json' },
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

  // 2. Direct fetch with ?action=getHistory
  try {
    const directUrl = `${cleanUrl}${cleanUrl.includes('?') ? '&' : '?'}action=getHistory&sheetName=${encodeURIComponent(cleanSheetName)}`;
    const res = await fetch(directUrl, {
      method: 'GET',
      redirect: 'follow',
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
