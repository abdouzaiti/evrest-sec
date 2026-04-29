import React, { useState } from 'react';
import { 
  Bell, 
  Info, 
  AlertTriangle, 
  CheckCircle2, 
  XOctagon, 
  Clock,
  ArrowRight,
  Check
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';

const INITIAL_NOTIFICATIONS: any[] = [];

export function Notifications() {
  const { t, isRTL } = useLanguage();
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [showSuccess, setShowSuccess] = useState(false);

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in">
      <header className={cn("flex flex-col md:flex-row justify-between items-start md:items-end gap-4", isRTL && "md:flex-row-reverse")}>
        <div className={cn(isRTL && "text-right w-full")}>
          <h1 className="text-3xl font-bold text-primary tracking-tight">{isRTL ? "Alertes Système" : "System Alerts"}</h1>
          <p className="text-slate-500 mt-1">{t('welcome_back')}</p>
        </div>
        <div className={cn("flex items-center gap-4 w-full md:w-auto", isRTL && "flex-row-reverse")}>
          {showSuccess && (
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-in fade-in slide-in-from-right-2">
              <Check size={14} />
              {isRTL ? "Marqué comme lu" : "All marked as read"}
            </span>
          )}
          <button 
            onClick={markAllAsRead}
            disabled={unreadCount === 0}
            className="text-sm font-semibold text-primary hover:text-accent font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            {isRTL ? "Tout marquer comme lu" : "Mark all as read"}
          </button>
        </div>
      </header>

      <div className="space-y-4">
        {notifications.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl shadow-sm text-center flex flex-col items-center gap-4">
             <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center">
               <Bell size={32} />
             </div>
             <p className="text-slate-400 font-black uppercase tracking-widest text-sm">
               {isRTL ? "Aucune alerte pour le moment" : "No active alerts at the moment"}
             </p>
          </div>
        ) : notifications.map((notif) => (
          <div 
            key={notif.id} 
            onClick={() => markAsRead(notif.id)}
            className={cn(
              "bg-white p-6 rounded-2xl shadow-sm flex items-start gap-5 hover:shadow-md transition-all group cursor-pointer border-l-4",
              notif.isRead ? "border-transparent opacity-75" : "border-accent",
              isRTL && "flex-row-reverse text-right"
            )}
          >
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110",
              notif.type === 'info' ? "bg-blue-50 text-blue-600" :
              notif.type === 'success' ? "bg-emerald-50 text-emerald-600" :
              notif.type === 'warning' ? "bg-amber-50 text-accent font-bold" :
              "bg-rose-50 text-rose-600"
            )}>
              {notif.type === 'info' && <Info size={24} />}
              {notif.type === 'success' && <CheckCircle2 size={24} />}
              {notif.type === 'warning' && <AlertTriangle size={24} />}
              {notif.type === 'danger' && <XOctagon size={24} />}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className={cn("flex items-start justify-between gap-4", isRTL && "flex-row-reverse")}>
                <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                  <h3 className="text-base font-bold text-primary leading-tight group-hover:text-accent transition-colors">{notif.title}</h3>
                  {!notif.isRead && (
                    <span className="w-2 h-2 bg-accent rounded-full shrink-0" />
                  )}
                </div>
                <span className={cn("text-xs font-medium text-slate-400 whitespace-nowrap flex items-center gap-1", isRTL && "flex-row-reverse")}>
                  <Clock size={12} />
                  {notif.time}
                </span>
              </div>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">{notif.message}</p>
              <button className={cn(
                "mt-4 flex items-center gap-1.5 text-xs font-bold text-primary hover:text-accent transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 transform transition-all",
                isRTL ? "flex-row-reverse -translate-x-0 md:translate-x-[10px] md:group-hover:translate-x-0" : "translate-x-0 md:translate-x-[-10px] md:group-hover:translate-x-0"
              )}>
                {isRTL ? "En savoir plus" : "Learn more"}
                <ArrowRight size={14} className={cn(isRTL && "rotate-180")} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

