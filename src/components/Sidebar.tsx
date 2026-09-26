import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  UserSquare2, 
  CreditCard, 
  Receipt,
  Bell, 
  LogOut,
  X,
  GraduationCap,
  CalendarDays
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { studentsService } from '../services/supabaseService';
import { Student } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { logout } = useAuth();
  const { t, isRTL } = useLanguage();
  const [alertCount, setAlertCount] = useState<number>(0);

  useEffect(() => {
    const calculateAlerts = async () => {
      try {
        const students = await studentsService.getAll();
        let count = 0;

        students.forEach((s: Student) => {
          const classIds = Array.isArray(s.classIds) && s.classIds.length > 0
            ? s.classIds
            : (s.classId ? [s.classId] : []);
          const attData: any = s.attendance || {};
          const paidMonths = Array.isArray(s.paidMonths) ? s.paidMonths : [];

          classIds.forEach(cid => {
            const classAtt = attData[cid] || {};
            for (let m = 1; m <= 12; m++) {
              const sessions = classAtt[m] || classAtt[String(m)] || [];
              if (Array.isArray(sessions) && sessions.length > 0) {
                const completedCount = sessions.filter(
                  x => x === true || x === 'present' || x === 'absent'
                ).length;
                const isPaid = paidMonths.includes(m);
                if (completedCount >= 3 && !isPaid) {
                  count++;
                }
              }
            }
          });
        });

        setAlertCount(count);
      } catch (err) {
        console.warn('Sidebar alert count notice:', err);
      }
    };

    calculateAlerts();
    const interval = setInterval(calculateAlerts, 12000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { icon: LayoutDashboard, label: t('dashboard'), href: '/' },
    { icon: CalendarDays, label: t('timetable'), href: '/timetable' },
    { icon: Users, label: t('classes'), href: '/classes' },
    { icon: GraduationCap, label: t('students'), href: '/students' },
    { icon: UserSquare2, label: t('teachers'), href: '/teachers' },
    { icon: CreditCard, label: t('payments'), href: '/payments' },
    { icon: Receipt, label: t('expenses'), href: '/expenses' },
    { icon: Bell, label: isRTL ? 'التنبيهات' : 'Notifications', href: '/notifications', badge: alertCount },
  ];

  return (
    <aside className={cn(
      "w-64 h-screen bg-white flex flex-col fixed top-0 z-40 transition-all duration-300 shadow-xl border-r border-slate-100",
      isRTL ? "right-0" : "left-0",
      !isOpen && (isRTL ? "translate-x-64" : "-translate-x-64")
    )}>
      <div className="p-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 transition-transform hover:scale-105">
            <img src="/logo.png" alt="Everest Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight text-primary block leading-none">Everest</span>
            <span className="text-[10px] font-bold text-accent uppercase tracking-[0.2em] mt-0.5 block">Secretory</span>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-primary lg:hidden"
        >
          <X size={24} />
        </button>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            onClick={() => onClose()}
            className={({ isActive }) => cn(
              "flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isActive 
                ? "bg-primary text-white shadow-md shadow-primary/10" 
                : "text-slate-600 hover:bg-slate-50 hover:text-primary"
            )}
          >
            <div className="flex items-center gap-3">
              <item.icon size={18} />
              <span>{item.label}</span>
            </div>
            {Boolean(item.badge && item.badge > 0) && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white shadow-xs">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4">
        <button
          onClick={logout}
          className={cn(
            "flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-700 transition-colors",
            isRTL && "flex-row-reverse"
          )}
        >
          <LogOut size={18} className={cn(isRTL && "rotate-180")} />
          {t('signOut')}
        </button>
      </div>
    </aside>
  );
}
