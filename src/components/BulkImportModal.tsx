import React, { useState } from 'react';
import { X, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { Customer } from '../types';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (newCustomers: Customer[], replaceAll: boolean) => void;
  existingCount: number;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  existingCount,
}) => {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'append' | 'replace'>('append');
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const handleApply = () => {
    if (lines.length === 0) {
      setFeedback('Vui lòng nhập hoặc dán ít nhất 1 tên khách hàng/quán.');
      return;
    }

    const timestamp = Date.now();
    const newCustomers: Customer[] = lines.map((name, idx) => ({
      id: `c_bulk_${timestamp}_${idx}`,
      name,
      active: true,
      orderIndex: (mode === 'append' ? existingCount : 0) + idx + 1,
    }));

    onImport(newCustomers, mode === 'replace');
    setText('');
    setFeedback(null);
    onClose();
  };

  const handleFillDemo100 = () => {
    const demo100 = [
      '8 lê đại hành',
      'Du mục',
      'Hàng quán',
      'Tự do',
      'Bia Ơi',
      'Bia Hơi Phố Cổ',
      'Cây Khế Quán',
      'Góc Phố 1982',
      'Hải Xồm - Tăng Bạt Hổ',
      'Thu Hằng - Kim Mã',
      'Lan Chín - Hai Bà Trưng',
      'Cường Hói - Thụy Khuê',
      'Chiến Béo - Nghi Tàm',
      'Vườn Bia 68',
      'Nhà Sàn Quán',
      'Bia Hơi Tây Hồ',
      'Ẩm Thực Du Ca',
      'Quán Gió Trúc Bạch',
      'Bia Hơi Đồng Đội',
      'Bia Hơi Ngon 36',
      'Bia Hơi Lạc Viên',
      'Bia Hơi Hàng Bè',
      'Bia Hơi Ngọc Khánh',
      'Bia Hơi Giảng Võ',
      'Bia Hơi Hoàng Cầu',
      'Bia Hơi Yên Phụ',
      'Bia Hơi Nghĩa Tân',
      'Bia Hơi Mỹ Đình',
      'Bia Hơi Linh Đàm',
      'Bia Hơi Cầu Giấy',
      'Bia Hơi Đống Đa',
      'Bia Hơi Hà Đông',
      'Quán Bia Bờ Sông',
      'Quán Bia Đại Cồ Việt',
      'Quán Bia Bạch Mai',
      'Quán Bia Trần Khát Chân',
      'Quán Bia Lò Đúc',
      'Quán Bia Võ Thị Sáu',
      'Quán Bia Thanh Nhàn',
      'Quán Bia Minh Khai',
      'Quán Bia Kim Ngưu',
      'Quán Bia Tam Trinh',
      'Quán Bia Vĩnh Tuy',
      'Quán Bia Giải Phóng',
      'Quán Bia Định Công',
      'Quán Bia Kim Giang',
      'Quán Bia Khương Đình',
      'Quán Bia Khương Trung',
      'Quán Bia Vũ Tông Phan',
      'Quán Bia Nguyễn Trãi',
      'Quán Bia Khuất Duy Tiến',
      'Quán Bia Lê Văn Lương',
      'Quán Bia Hoàng Minh Giám',
      'Quán Bia Trung Hòa',
      'Quán Bia Nhân Chính',
      'Quán Bia Vũ Phạm Hàm',
      'Quán Bia Trung Kính',
      'Quán Bia Trần Thái Tông',
      'Quán Bia Duy Tân',
      'Quán Bia Dịch Vọng',
      'Quán Bia Nghĩa Đô',
      'Quán Bia Xuân Thủy',
      'Quán Bia Hồ Tùng Mậu',
      'Quán Bia Lê Đức Thọ',
      'Quán Bia Hàm Nghi',
      'Quán Bia Nguyễn Cơ Thạch',
      'Quán Bia Châu Văn Liêm',
      'Quán Bia Mễ Trì',
      'Quán Bia Đình Thôn',
      'Quán Bia Nam Từ Liêm',
      'Quán Bia Bắc Từ Liêm',
      'Quán Bia Cổ Nhuế',
      'Quán Bia Hoàng Quốc Việt',
      'Quán Bia Lạc Long Quân',
      'Quán Bia Thụy Khuê 2',
      'Quán Bia Hoàng Hoa Thám',
      'Quán Bia Đội Cấn',
      'Quán Bia Liễu Giai',
      'Quán Bia Văn Cao',
      'Quán Bia Nguyễn Chí Thanh',
      'Quán Bia Huỳnh Thúc Kháng',
      'Quán Bia Thái Hà',
      'Quán Bia Chùa Bộc',
      'Quán Bia Phạm Ngọc Thạch',
      'Quán Bia Tôn Thất Tùng',
      'Quán Bia Trường Chinh',
      'Quán Bia Đại La',
      'Quán Bia Phố Huế',
      'Quán Bia Hàng Bài',
      'Quán Bia Đinh Tiên Hoàng',
      'Quán Bia Tràng Tiền',
      'Quán Bia Phan Chu Trinh',
      'Quán Bia Lý Thường Kiệt',
      'Quán Bia Trần Hưng Đạo',
      'Quán Bia Quán Sứ',
      'Quán Bia Thợ Nhuộm',
      'Quán Bia Hàng Bông',
      'Quán Bia Cửa Nam',
      'Quán Bia Điện Biên Phủ',
      'Bia Hơi 100 - Tổng Điểm Bán',
    ];
    setText(demo100.join('\n'));
    setFeedback('Đã nạp danh sách mẫu 100 điểm bán!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Upload className="w-5 h-5 text-amber-600" />
              <span>Nhập Nhanh Danh Sách Điểm Bán (Không Giới Hạn)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Dán danh sách tên các quán từ Excel hoặc danh bạ (mỗi dòng một quán). Hỗ trợ lên đến 100+ điểm bán.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700">
              Danh sách tên điểm bán (Đã phát hiện: {lines.length} quán):
            </label>
            <button
              type="button"
              onClick={handleFillDemo100}
              className="text-xs text-amber-700 hover:text-amber-800 font-semibold underline underline-offset-2"
            >
              Nạp mẫu nhanh 100 quán bia
            </button>
          </div>

          <textarea
            value={text}
            onChange={e => {
              setText(e.target.value);
              setFeedback(null);
            }}
            placeholder={`8 lê đại hành\nDu mục\nHàng quán\nTự do\nBia Ơi\n... (Dán thêm 100 quán vào đây)`}
            rows={10}
            className="w-full text-sm font-mono border border-slate-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />

          {feedback && (
            <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <span className="text-xs font-semibold text-slate-700 block">Chế độ nhập:</span>
            <div className="flex flex-col sm:flex-row gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  checked={mode === 'append'}
                  onChange={() => setMode('append')}
                  className="text-amber-600 focus:ring-amber-500"
                />
                <span>Thêm tiếp vào danh sách hiện có (Hiện có: {existingCount} quán)</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  checked={mode === 'replace'}
                  onChange={() => setMode('replace')}
                  className="text-amber-600 focus:ring-amber-500"
                />
                <span className="text-rose-600 font-medium">Thay thế toàn bộ danh sách cũ</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
          <span className="text-xs text-slate-500">
            Tổng số quán sau khi lưu: {mode === 'replace' ? lines.length : existingCount + lines.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              onClick={handleApply}
              disabled={lines.length === 0}
              className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Xác Nhận Nhập ({lines.length} Quán)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
