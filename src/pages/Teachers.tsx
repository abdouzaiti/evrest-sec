import React, { useState, useEffect } from 'react';
import { Search, Plus, Calendar, DollarSign, Briefcase, Banknote, Loader2, Trash2, AlertCircle } from 'lucide-react';
import { Teacher } from '../types';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import { teachersService } from '../services/supabaseService';
import { Modal } from '../components/Modal';

export function Teachers() {
  const { t, isRTL } = useLanguage();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTeacher, setNewTeacher] = useState<Omit<Teacher, 'id'>>({
    name: '',
    email: '',
    subject: '',
    salary: 0,
    paymentStatus: 'Unpaid'
  });

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      setConfigError(null);
      const data = await teachersService.getAll();
      setTeachers(data);
    } catch (error: any) {
      console.error('Error fetching teachers:', error);
      if (error.message?.includes('Supabase credentials missing')) {
        setConfigError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await teachersService.create(newTeacher);
      setTeachers(prev => [...prev, created]);
      setIsModalOpen(false);
      setNewTeacher({
        name: '',
        email: '',
        subject: '',
        salary: 0,
        paymentStatus: 'Unpaid'
      });
    } catch (error) {
      console.error('Error creating teacher:', error);
    }
  };

  const handlePaySalary = async (id: string) => {
    try {
      const updated = await teachersService.updatePayment(id, 'Paid');
      setTeachers(prev => prev.map(t => t.id === id ? updated : t));
    } catch (error) {
      console.error('Error paying salary:', error);
    }
  };

  const handleDeleteTeacher = async (id: string) => {
    if (!confirm(isRTL ? 'Supprimer ce professeur ?' : 'Delete this teacher?')) return;
    try {
      await teachersService.delete(id);
      setTeachers(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      console.error('Error deleting teacher:', error);
    }
  };

  const totalPayroll = teachers.reduce((acc, curr) => acc + curr.salary, 0);

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (configError) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-6">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-2xl font-black text-primary mb-4 tracking-tight">
          {isRTL ? "Configuration Requise" : "Configuration Required"}
        </h2>
        <p className="text-slate-500 font-medium leading-relaxed mb-8">
          {configError}
        </p>
        <button 
          onClick={fetchTeachers}
          className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20"
        >
          {isRTL ? "Réessayer" : "Check Again"}
        </button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6 animate-in", isRTL && "text-right")}>
      <header className={cn("flex flex-col md:flex-row justify-between items-start md:items-end gap-4", isRTL && "md:flex-row-reverse")}>
        <div className={cn(isRTL && "text-right")}>
          <h1 className="text-3xl font-bold text-primary tracking-tight">{t('teachers')}</h1>
          <p className="text-slate-500 mt-1">{t('staff_management')}</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full md:w-auto bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl text-sm font-semibold shadow-lg shadow-primary/10 transition-all flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          {isRTL ? "إضافة معلم" : "Add Teacher"}
        </button>
      </header>

      <div className={cn("grid grid-cols-1 lg:grid-cols-12 gap-16 pt-10 border-t border-slate-100", isRTL && "lg:flex lg:flex-row-reverse")}>
        <div className="lg:col-span-8 space-y-10 focus-within:ring-2 ring-primary/5 transition-all">
          <div className="overflow-x-auto">
            <table className={cn("w-full text-left", isRTL && "text-right")}>
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                  <th className="px-8 py-5">{t('staff_member')}</th>
                  <th className="px-8 py-5">{t('subject')}</th>
                  <th className="px-8 py-5 text-center">{t('salary')}</th>
                  <th className="px-8 py-5 text-center">{t('status')}</th>
                  <th className={cn("px-8 py-5", isRTL ? "text-left" : "text-right")}>{isRTL ? "الإجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {teachers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-medium">
                      {isRTL ? "Aucun enseignant trouvé" : "No teachers found or registered"}
                    </td>
                  </tr>
                ) : teachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-slate-50/20 transition-colors group">
                    <td className="px-8 py-6">
                      <div className={cn("flex items-center gap-4", isRTL && "flex-row-reverse")}>
                        <div className="w-12 h-12 bg-primary/5 text-primary rounded-2xl flex items-center justify-center font-black text-sm transition-transform group-hover:scale-110">
                          <Briefcase size={24} />
                        </div>
                        <div className={cn(isRTL && "text-right")}>
                          <p className="text-base font-black text-primary group-hover:text-accent transition-colors">{teacher.name}</p>
                          <p className="text-xs text-slate-400 font-bold tracking-widest">{teacher.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-xs font-black text-slate-500 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-lg group-hover:bg-primary/10 group-hover:text-primary transition-all">{teacher.subject}</span>
                    </td>
                    <td className="px-8 py-6 text-center text-base text-primary font-black tracking-tight">{teacher.salary.toLocaleString()} {t('currency')}</td>
                    <td className="px-8 py-6 text-center">
                      <span className={cn(
                        "inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest ring-2 ring-inset uppercase transition-all",
                        teacher.paymentStatus === 'Paid' ? "bg-emerald-50 text-emerald-700 ring-emerald-100" : "bg-rose-50 text-rose-700 ring-rose-100"
                      )}>
                        {teacher.paymentStatus === 'Paid' ? t('paid') : t('pending')}
                      </span>
                    </td>
                    <td className={cn("px-8 py-6", isRTL ? "text-left" : "text-right")}>
                      <div className={cn("flex items-center gap-3 justify-end", isRTL && "justify-start")}>
                        <button 
                          onClick={() => handlePaySalary(teacher.id)}
                          className="bg-slate-50 hover:bg-slate-100 text-slate-600 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-30 active:scale-95" 
                          disabled={teacher.paymentStatus === 'Paid'}
                        >
                          {t('pay_salary')}
                        </button>
                        <button 
                          onClick={() => handleDeleteTeacher(teacher.id)}
                          className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-12 lg:col-span-4">
          <div className="bg-primary rounded-3xl p-10 text-white shadow-2xl shadow-primary/30 relative overflow-hidden group">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl transition-transform group-hover:scale-150 duration-700"></div>
            <h3 className="text-sm font-black uppercase tracking-[0.3em] mb-6 relative z-10 text-primary-100">{t('total_payroll')}</h3>
            <div className="flex items-center gap-6 relative z-10">
              <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-xl">
                <Banknote size={32} />
              </div>
              <div>
                <p className="text-4xl md:text-5xl font-black tracking-tighter">
                  {totalPayroll.toLocaleString()}
                </p>
                <p className="text-xs font-bold text-primary-200 mt-2 tracking-widest uppercase">{t('currency')} • Cash only payments</p>
              </div>
            </div>
            <button className="w-full mt-10 bg-accent text-white font-black py-5 rounded-2xl hover:bg-accent/90 transition-all shadow-xl shadow-accent/20 relative z-10 active:scale-95 uppercase tracking-[0.2em] text-sm">
              {t('batch_pay')}
            </button>
          </div>

          <div className="space-y-8">
            <h3 className={cn("text-xl font-black text-primary flex items-center gap-3 tracking-tighter", isRTL && "flex-row-reverse")}>
              <Calendar size={24} className="text-accent" />
              {t('upcoming_exams')}
            </h3>
            <div className="space-y-6">
              <p className="text-sm text-slate-400 font-medium italic">{isRTL ? "Aucun examen prévu" : "No upcoming exams scheduled"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Teacher Creation Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={isRTL ? "إضافة معلم جديد" : "Add New Teacher"}
      >
        <form onSubmit={handleCreateTeacher} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">{isRTL ? "اسم المعلم" : "Teacher Name"}</label>
            <input
              required
              type="text"
              value={newTeacher.name}
              onChange={e => setNewTeacher({ ...newTeacher, name: e.target.value })}
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold"
              placeholder="Full Name"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Email</label>
            <input
              required
              type="email"
              value={newTeacher.email}
              onChange={e => setNewTeacher({ ...newTeacher, email: e.target.value })}
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold"
              placeholder="email@school.com"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">{t('subject')}</label>
            <input
              required
              type="text"
              value={newTeacher.subject}
              onChange={e => setNewTeacher({ ...newTeacher, subject: e.target.value })}
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold"
              placeholder="e.g. Mathematics"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">{t('salary')}</label>
            <input
              required
              type="number"
              value={newTeacher.salary}
              onChange={e => setNewTeacher({ ...newTeacher, salary: Number(e.target.value) })}
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold"
              placeholder="120000"
            />
          </div>
          <button type="submit" className="w-full bg-primary text-white p-4 rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
            {isRTL ? "إضافة" : "Add Teacher"}
          </button>
        </form>
      </Modal>
    </div>
  );
}

