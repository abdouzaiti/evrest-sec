import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Search, 
  TrendingUp, 
  Users, 
  UserSquare2, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Student, Teacher, SchoolClass } from '../types';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import { studentsService, teachersService, classesService } from '../services/supabaseService';

export function Payments() {
  const { t, isRTL } = useLanguage();
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [studentsData, teachersData, classesData] = await Promise.all([
        studentsService.getAll(),
        teachersService.getAll(),
        classesService.getAll()
      ]);
      setStudents(studentsData);
      setTeachers(teachersData);
      setClasses(classesData);
    } catch (error: any) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStudentPrice = (classId: string) => {
    return classes.find(c => c.id === classId)?.price || 0;
  };

  const totalCollected = students
    .filter(s => s.paymentStatus === 'Paid')
    .reduce((acc, curr) => acc + getStudentPrice(curr.classId), 0);

  const totalPending = students
    .filter(s => s.paymentStatus === 'Pending' || s.paymentStatus === 'Unpaid')
    .reduce((acc, curr) => acc + getStudentPrice(curr.classId), 0);

  const totalPayroll = teachers
    .reduce((acc, curr) => acc + curr.salary, 0);

  const filteredItems = [
    ...students.map(s => ({ 
      id: s.id, 
      name: s.name, 
      type: 'Student', 
      amount: getStudentPrice(s.classId),
      status: s.paymentStatus,
      date: 'This month'
    })),
    ...teachers.map(t => ({ 
      id: t.id, 
      name: t.name, 
      type: 'Teacher', 
      amount: t.salary,
      status: t.paymentStatus,
      date: t.lastPaymentDate || 'Pending'
    }))
  ].filter(item => item.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-12 animate-in", isRTL && "text-right")}>
      <header className={cn("flex flex-col md:flex-row justify-between items-start md:items-end gap-4", isRTL && "md:flex-row-reverse")}>
        <div className={cn(isRTL && "text-right")}>
          <h1 className="text-3xl md:text-5xl font-black text-primary tracking-tighter">{isRTL ? "Gestion des Paiements" : "Payment Ledger"}</h1>
          <p className="text-slate-500 mt-2 text-lg">{isRTL ? "Suivi des revenus et des salaires" : "Track school revenue and staff payroll"}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-emerald-50 p-8 rounded-3xl group border-2 border-emerald-100/50">
          <div className={cn("flex items-center justify-between mb-4", isRTL && "flex-row-reverse")}>
            <div className="p-3 bg-emerald-500 text-white rounded-2xl">
              <TrendingUp size={24} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full">Collected</span>
          </div>
          <p className="text-xs font-black text-emerald-600/60 uppercase tracking-[0.2em] mb-2">{isRTL ? "REVENUS RÉCOLTÉS" : "TOTAL REVENUE"}</p>
          <h3 className="text-3xl font-black text-emerald-700 tracking-tighter">{totalCollected.toLocaleString()} {t('currency')}</h3>
        </div>

        <div className="bg-amber-50 p-8 rounded-3xl group border-2 border-amber-100/50">
          <div className={cn("flex items-center justify-between mb-4", isRTL && "flex-row-reverse")}>
            <div className="p-3 bg-amber-500 text-white rounded-2xl">
              <Clock size={24} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-100 px-3 py-1 rounded-full">Outstanding</span>
          </div>
          <p className="text-xs font-black text-amber-600/60 uppercase tracking-[0.2em] mb-2">{isRTL ? "PAIEMENTS EN ATTENTE" : "PENDING STUDENTS"}</p>
          <h3 className="text-3xl font-black text-amber-700 tracking-tighter">{totalPending.toLocaleString()} {t('currency')}</h3>
        </div>

        <div className="bg-rose-50 p-8 rounded-3xl group border-2 border-rose-100/50">
          <div className={cn("flex items-center justify-between mb-4", isRTL && "flex-row-reverse")}>
            <div className="p-3 bg-rose-500 text-white rounded-2xl">
              <UserSquare2 size={24} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 bg-rose-100 px-3 py-1 rounded-full">Payroll</span>
          </div>
          <p className="text-xs font-black text-rose-600/60 uppercase tracking-[0.2em] mb-2">{isRTL ? "TOTAL SALAIRES" : "MONTHLY PAYROLL"}</p>
          <h3 className="text-3xl font-black text-rose-700 tracking-tighter">{totalPayroll.toLocaleString()} {t('currency')}</h3>
        </div>
      </div>

      <div className="space-y-6">
        <div className={cn("flex flex-col md:flex-row justify-between items-center gap-6", isRTL && "md:flex-row-reverse text-right")}>
          <h2 className="text-2xl font-black text-primary tracking-tight">{isRTL ? "Historique des Transactions" : "Transaction History"}</h2>
          <div className="relative w-full md:w-80">
            <Search className={cn("absolute top-1/2 -translate-y-1/2 text-slate-400", isRTL ? "right-4" : "left-4")} size={18} />
            <input
              type="text"
              placeholder={isRTL ? "Rechercher..." : "Search transactions..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(
                "w-full py-3.5 bg-slate-50 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/5 outline-none transition-all placeholder:text-slate-400",
                isRTL ? "pr-12 pl-4 text-right" : "pl-12 pr-4"
              )}
            />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
          <table className={cn("w-full text-left", isRTL && "text-right")}>
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                <th className="px-8 py-5">Entity</th>
                <th className="px-8 py-5">Type</th>
                <th className="px-8 py-5">Date</th>
                <th className="px-8 py-5">Amount</th>
                <th className="px-8 py-5">Status</th>
                <th className={cn("px-8 py-5", isRTL ? "text-left" : "text-right")}>Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredItems.map((item, i) => (
                <tr key={i} className="hover:bg-slate-50/20 transition-colors group">
                  <td className="px-8 py-6">
                    <p className="text-base font-black text-primary group-hover:text-accent transition-colors">{item.name}</p>
                  </td>
                  <td className="px-8 py-6">
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg",
                      item.type === 'Student' ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                    )}>
                      {item.type}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-sm font-medium text-slate-400">{item.date}</td>
                  <td className="px-8 py-6 font-black text-primary">{item.amount.toLocaleString()} {t('currency')}</td>
                  <td className="px-8 py-6">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ring-2 ring-inset transition-all",
                      item.status === 'Paid' ? "bg-emerald-50 text-emerald-700 ring-emerald-100" : "bg-rose-50 text-rose-700 ring-rose-100"
                    )}>
                      {item.status === 'Paid' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                      {item.status}
                    </span>
                  </td>
                  <td className={cn("px-8 py-6", isRTL ? "text-left" : "text-right")}>
                    <button className="text-[10px] font-black text-primary hover:text-accent transition-colors uppercase tracking-widest underline-offset-4 hover:underline">
                      View details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
