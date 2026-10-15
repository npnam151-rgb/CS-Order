import React from 'react';
import { Beer, Settings } from 'lucide-react';

interface HeaderProps {
  currentTab: 'order' | 'admin';
  onSelectTab: (tab: 'order' | 'admin') => void;
  activeOrderCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Brand Wordmark linking to Order page */}
          <button
            type="button"
            onClick={() => onSelectTab('order')}
            className="flex items-center gap-2.5 shrink-0 cursor-pointer hover:opacity-85 transition-opacity text-left"
            title="Bấm để về Bảng Đặt Hàng"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center text-white shadow-sm">
              <Beer className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap">
              Đặt hàng kênh sỉ
            </span>
          </button>

          {/* Zone 2: Primary Action - Gear Icon Only */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onSelectTab('admin')}
              className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                currentTab === 'admin'
                  ? 'bg-slate-900 text-amber-400 shadow-xs ring-2 ring-slate-800'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 shadow-2xs'
              }`}
              title="Cài đặt & Quản trị"
              aria-label="Cài đặt & Quản trị"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
