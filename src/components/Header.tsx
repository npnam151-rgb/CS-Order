import React from 'react';
import { Beer, Settings, FileSpreadsheet, HelpCircle, History, Plus } from 'lucide-react';

interface HeaderProps {
  currentTab: 'order' | 'history' | 'admin';
  onSelectTab: (tab: 'order' | 'history' | 'admin') => void;
  onOpenGuide: () => void;
  onOpenBulkImport: () => void;
  hasScriptConfigured: boolean;
  activeOrderCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  onOpenGuide,
  onOpenBulkImport,
  hasScriptConfigured,
  activeOrderCount,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Single Brand wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center text-white shadow-sm">
              <Beer className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
                Bia Hơi Order
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                Google Sheets
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="flex items-center gap-2 sm:gap-6 text-sm font-medium text-slate-600">
            <button
              onClick={() => onSelectTab('order')}
              className={`py-1.5 px-3 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                currentTab === 'order'
                  ? 'bg-amber-50 text-amber-900 font-semibold'
                  : 'hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-600" />
              <span>Bảng Đặt Hàng</span>
              {activeOrderCount > 0 && (
                <span className="ml-1 text-xs font-bold text-amber-800 bg-amber-200/80 rounded-full px-1.5 py-0.2">
                  {activeOrderCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectTab('history')}
              className={`py-1.5 px-3 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                currentTab === 'history'
                  ? 'bg-amber-50 text-amber-900 font-semibold'
                  : 'hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <History className="w-4 h-4 text-slate-500" />
              <span className="hidden md:inline">Lịch Sử & Báo Cáo</span>
              <span className="md:hidden">Lịch Sử</span>
            </button>

            <button
              onClick={onOpenGuide}
              className="py-1.5 px-3 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
              title="Hướng dẫn kết nối Google Sheet"
            >
              <HelpCircle className="w-4 h-4 text-slate-500" />
              <span className="hidden lg:inline">Cài Đặt Sheet</span>
            </button>

            <button
              onClick={onOpenBulkImport}
              className="hidden sm:flex items-center gap-1 py-1.5 px-3 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
              title="Nhập nhanh danh sách 100+ khách hàng"
            >
              <Plus className="w-4 h-4 text-slate-500" />
              <span>Thêm 100+ Quán</span>
            </button>
          </nav>

          {/* Zone 3: Primary Action - Admin Entry */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onSelectTab('admin')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap shrink-0 flex items-center gap-2 shadow-xs cursor-pointer ${
                currentTab === 'admin'
                  ? 'bg-amber-600 text-white ring-2 ring-amber-300'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
              title="Nhấn vào đây để vào Quản trị Admin (Mã PIN: 1234)"
            >
              <Settings className="w-4 h-4 text-amber-400" />
              <span>Quản Trị Admin</span>
              <span className="hidden sm:inline-block text-[10px] bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded font-mono">
                PIN: 1234
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
