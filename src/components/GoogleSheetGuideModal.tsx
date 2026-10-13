import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, Zap, Terminal } from 'lucide-react';
import { APPS_SCRIPT_TEMPLATE } from '../services/googleSheets';

interface GoogleSheetGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  scriptUrl: string;
  onSaveScriptUrl: (url: string) => void;
  onTestConnection: (url: string) => Promise<{ success: boolean; message: string }>;
}

export const GoogleSheetGuideModal: React.FC<GoogleSheetGuideModalProps> = ({
  isOpen,
  onClose,
  scriptUrl,
  onSaveScriptUrl,
  onTestConnection,
}) => {
  const [copied, setCopied] = useState(false);
  const [tempUrl, setTempUrl] = useState(scriptUrl);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTest = async () => {
    if (!tempUrl.trim()) return;
    setTesting(true);
    setTestResult(null);
    const res = await onTestConnection(tempUrl);
    setTesting(false);
    setTestResult(res);
    if (res.success) {
      onSaveScriptUrl(tempUrl);
    }
  };

  const handleSaveAndClose = () => {
    onSaveScriptUrl(tempUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-600" />
              <span>Hướng Dẫn Kết Nối Google Sheets (Chỉ Mất 1 Phút)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Dữ liệu đơn hàng sẽ được tự động đồng bộ tức thì vào trang tính Google Sheets của bạn.
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
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-sm text-slate-700">
          {/* Step-by-step */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-bold text-xs shrink-0">
                1
              </span>
              <div>
                <p className="font-semibold text-slate-900">
                  Tạo 1 Google Sheet mới hoặc mở Google Sheet có sẵn
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Bạn có thể tạo nhanh tại{' '}
                  <a
                    href="https://sheets.new"
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-700 hover:underline inline-flex items-center gap-0.5 font-medium"
                  >
                    sheets.new <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-bold text-xs shrink-0">
                2
              </span>
              <div className="flex-1">
                <p className="font-semibold text-slate-900">
                  Vào menu <span className="text-amber-700 font-bold">Tiện ích mở rộng (Extensions)</span> →{' '}
                  <span className="text-amber-700 font-bold">Apps Script</span>
                </p>
                <p className="text-xs text-slate-500 mt-0.5 mb-2">
                  Xóa toàn bộ mã mặc định và dán đoạn mã Apps Script được tạo sẵn bên dưới:
                </p>

                <div className="relative rounded-lg bg-slate-900 text-slate-200 p-3 text-xs font-mono max-h-48 overflow-y-auto border border-slate-800">
                  <button
                    onClick={handleCopyCode}
                    className="absolute top-2 right-2 px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-sans text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Đã sao chép!' : 'Sao chép mã'}</span>
                  </button>
                  <pre>{APPS_SCRIPT_TEMPLATE}</pre>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-bold text-xs shrink-0">
                3
              </span>
              <div>
                <p className="font-semibold text-slate-900">
                  Nhấn nút <span className="text-amber-700 font-bold">Triển khai (Deploy)</span> →{' '}
                  <span className="font-medium">Tùy chọn triển khai mới (New deployment)</span>
                </p>
                <ul className="text-xs text-slate-600 mt-1 list-disc list-inside space-y-1">
                  <li>Chọn loại: <b>Ứng dụng web (Web app)</b></li>
                  <li>Mục <b>Ai có quyền truy cập (Who has access)</b>: Chọn <b>Bất kỳ ai (Anyone)</b> (rất quan trọng)</li>
                  <li>Nhấn <b>Triển khai (Deploy)</b> và cấp quyền khi Google yêu cầu.</li>
                  <li>Sao chép <b>URL ứng dụng web</b> (dạng: <code className="bg-slate-100 px-1 py-0.5 rounded text-amber-800 font-mono">https://script.google.com/macros/s/.../exec</code>).</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Test & Save URL */}
          <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200 space-y-3">
            <label className="block text-xs font-bold text-amber-950 uppercase tracking-wider">
              Dán URL Ứng dụng Web của bạn vào đây:
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={tempUrl}
                onChange={e => {
                  setTempUrl(e.target.value);
                  setTestResult(null);
                }}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
              <button
                type="button"
                onClick={handleTest}
                disabled={testing || !tempUrl.trim()}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition-colors shrink-0 flex items-center justify-center gap-1.5"
              >
                {testing ? (
                  <span>Đang kiểm tra...</span>
                ) : (
                  <>
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Kiểm Tra Kết Nối</span>
                  </>
                )}
              </button>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-lg text-xs font-medium ${
                  testResult.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {testResult.message}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Đóng
          </button>
          <button
            onClick={handleSaveAndClose}
            className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs transition-colors"
          >
            Lưu Cấu Hình
          </button>
        </div>
      </div>
    </div>
  );
};
