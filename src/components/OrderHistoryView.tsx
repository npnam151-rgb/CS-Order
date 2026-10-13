import React, { useState } from 'react';
import { History, Download, CheckCircle, AlertCircle, Eye, Calendar, User, ArrowLeft } from 'lucide-react';
import { OrderSubmission, ProductItem } from '../types';

interface OrderHistoryViewProps {
  history: OrderSubmission[];
  products: ProductItem[];
  onBackToOrder: () => void;
}

export const OrderHistoryView: React.FC<OrderHistoryViewProps> = ({
  history,
  products,
  onBackToOrder,
}) => {
  const [selectedOrder, setSelectedOrder] = useState<OrderSubmission | null>(null);

  const activeProducts = products.filter(p => p.active);

  const handleDownloadSingleOrderCSV = (order: OrderSubmission) => {
    const headers = ['Ngày đặt hàng', 'NV Sale đặt đơn', 'Khách hàng', ...activeProducts.map(p => `${p.name} (${p.unit})`), 'Thời gian'];
    const rows: string[][] = [headers];

    order.rows.forEach(r => {
      const rowData = [
        `"${order.orderDate}"`,
        `"${order.salesRep.replace(/"/g, '""')}"`,
        `"${r.customerName.replace(/"/g, '""')}"`,
      ];
      activeProducts.forEach(p => {
        rowData.push(String(r.quantities[p.id] || 0));
      });
      rowData.push(`"${new Date(order.submittedAt).toLocaleString('vi-VN')}"`);
      rows.push(rowData);
    });

    const csvContent = '\uFEFF' + rows.map(r => r.join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DonHang_${order.orderDate}_${order.salesRep.replace(/\s+/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Lịch Sử Đơn Hàng Đã Gửi ({history.length} Lần Gửi)
            </h2>
            <p className="text-xs text-slate-500">
              Theo dõi và tải lại các phiếu đặt hàng đã gửi vào Google Sheets hoặc lưu cục bộ.
            </p>
          </div>
        </div>

        <button
          onClick={onBackToOrder}
          className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại Bảng Nhập Đơn</span>
        </button>
      </div>

      {/* Order List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {history.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <History className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-sm font-medium">Chưa có lịch sử gửi đơn nào.</p>
            <p className="text-xs">Khi bạn nhấn "Gửi đơn vào Google Sheet", thông tin đơn sẽ được lưu lại tại đây.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm divide-y divide-slate-200">
              <thead className="bg-slate-50 text-xs font-bold text-slate-700 uppercase">
                <tr>
                  <th className="py-3 px-4">Thời Gian Gửi</th>
                  <th className="py-3 px-4">Ngày Đặt Hàng</th>
                  <th className="py-3 px-4">NV Sale Đặt Đơn</th>
                  <th className="py-3 px-4 text-center">Số Quán Lên Đơn</th>
                  <th className="py-3 px-4 text-center">Trạng Thái Đồng Bộ</th>
                  <th className="py-3 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {history.map(order => (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {new Date(order.submittedAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {order.orderDate}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {order.salesRep}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-amber-800">
                      {order.totalCustomersWithOrder} quán ({order.rows.length} dòng)
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-medium ${
                          order.status === 'synced'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {order.status === 'synced' ? (
                          <>
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            <span>Đã lưu Sheet</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                            <span>Lỗi lưu</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Xem</span>
                        </button>
                        <button
                          onClick={() => handleDownloadSingleOrderCSV(order)}
                          className="px-2.5 py-1 text-amber-800 hover:bg-amber-50 rounded-lg transition-colors flex items-center gap-1"
                          title="Tải file CSV"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Tải</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drill-down modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Chi Tiết Đơn Hàng Ngày {selectedOrder.orderDate}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  NV Sale: {selectedOrder.salesRep} · Gửi lúc: {new Date(selectedOrder.submittedAt).toLocaleString('vi-VN')}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
              >
                Đóng
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <table className="w-full text-left text-xs divide-y divide-slate-200 border border-slate-200 rounded-lg">
                <thead className="bg-slate-50 font-bold text-slate-700">
                  <tr>
                    <th className="py-2.5 px-3">STT</th>
                    <th className="py-2.5 px-3">Khách Hàng</th>
                    {activeProducts.map(p => (
                      <th key={p.id} className="py-2.5 px-3 text-center">
                        {p.name} ({p.unit})
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedOrder.rows.map((r, i) => (
                    <tr key={r.customerId} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-slate-400 font-mono">{i + 1}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">{r.customerName}</td>
                      {activeProducts.map(p => (
                        <td key={p.id} className="py-2 px-3 text-center font-mono font-bold text-amber-900">
                          {r.quantities[p.id] || 0}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => handleDownloadSingleOrderCSV(selectedOrder)}
                className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải File CSV Đơn Này</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
