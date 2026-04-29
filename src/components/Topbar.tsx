import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, UserCircle, Globe, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { cn } from '../lib/utils';

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { user } = useAuth();
  const { language, setLanguage, isRTL } = useLanguage();
  const navigate = useNavigate();

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md sticky top-0 z-10 px-4 md:px-8 flex items-center justify-between">
      <div className={cn("flex items-center gap-4 flex-1", isRTL && "flex-row-reverse")}>
        <button 
          onClick={onMenuClick}
          className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg lg:hidden"
        >
          <Menu size={24} />
        </button>

        <div className="relative max-w-md w-full hidden sm:block">
          <Search className={cn("absolute top-1/2 -translate-y-1/2 text-slate-400", isRTL ? "right-3" : "left-3")} size={18} />
          <input
            type="text"
            placeholder="Rechercher..."
            className={cn(
              "w-full pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none",
              isRTL ? "pr-10 pl-4 text-right" : "pl-10 pr-4"
            )}
          />
        </div>
      </div>

      <div className={cn("flex items-center gap-2 md:gap-6", isRTL && "flex-row-reverse")}>
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
          {(['fr', 'ar', 'en'] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={cn(
                "px-2 py-1 text-[10px] font-bold rounded-md uppercase transition-all",
                language === lang ? "bg-white text-primary shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              {lang}
            </button>
          ))}
        </div>

        <button 
          onClick={() => navigate('/notifications')}
          className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
        >
          <Bell size={20} />
          <span className={cn("absolute top-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white", isRTL ? "left-2" : "right-2")}></span>
        </button>

        <div className={cn("flex items-center gap-3", isRTL ? "pr-6" : "pl-6")}>
          <div className={cn("text-right hidden sm:block", isRTL && "text-left")}>
            <p className="text-sm font-semibold text-slate-900 leading-none">{user?.displayName}</p>
            <p className="text-xs text-slate-500 mt-1 capitalize">{user?.role}</p>
          </div>
          <div className="w-9 h-9 bg-slate-200 rounded-full flex items-center justify-center text-slate-600">
            <UserCircle size={28} />
          </div>
        </div>
      </div>
    </header>
  );
}
