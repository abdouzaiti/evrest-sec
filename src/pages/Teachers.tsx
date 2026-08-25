import React, { useState, useEffect } from 'react';
import { Search, Plus, Calendar, DollarSign, Briefcase, Banknote, Loader2, Trash2, AlertCircle, Shield, Pencil, FileText, Clock, ChevronDown } from 'lucide-react';
import { Teacher, PointageLog, SchoolClass, Student, PaymentStatus } from '../types';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { classesService, studentsService, pointageService, teachersService } from '../services/supabaseService';
import { Modal } from '../components/Modal';

export function Teachers() {
  const { t, isRTL } = useLanguage();
  const { activeRole } = useAuth();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [teacherLogs, setTeacherLogs] = useState<PointageLog[]>([]);
  const [openMonthDropdownId, setOpenMonthDropdownId] = useState<string | null>(null);
  const [openStatusDropdownId, setOpenStatusDropdownId] = useState<string | null>(null);

  const [newTeacher, setNewTeacher] = useState<Omit<Teacher, 'id'>>({
    name: '',
    email: '',
    subject: '',
    salary: 0,
    paymentStatus: 'Unpaid',
    tokenId: ''
  });

  const [editingTeacherId, setEditingTeacherId] = useState<string>('');
  const [editTeacher, setEditTeacher] = useState<Omit<Teacher, 'id'>>({
    name: '',
    email: '',
    subject: '',
    salary: 0,
    paymentStatus: 'Unpaid',
    tokenId: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tData, cData, sData] = await Promise.all([
        teachersService.getAll(),
        classesService.getAll(),
        studentsService.getAll()
      ]);
      setTeachers(tData);
      setClasses(cData);
      setStudents(sData);
    } catch (error: any) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper to calculate salary
  const calculateSalary = (teacherId: string) => {
    const teacherClasses = classes.filter(c => c.teacherId === teacherId);
    let totalPayment = 0;
    teacherClasses.forEach(c => {
        const studentsInClass = students.filter(s => s.classId === c.id);
        // Assuming each student pays the full class price
        totalPayment += studentsInClass.length * c.price;
    });
    return totalPayment * 0.5;
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
        paymentStatus: 'Unpaid',
        tokenId: ''
      });
    } catch (error) {
      console.error('Error creating teacher:', error);
    }
  };

  const handleUpdateTeacherMonthStatus = async (teacher: Teacher, newStatus: PaymentStatus) => {
    const activeMonth = teacher.currentMonth || 1;
    let newPaidMonths = teacher.paidMonths || [];

    if (newStatus === 'Paid') {
      if (!newPaidMonths.includes(activeMonth)) {
        newPaidMonths = [...newPaidMonths, activeMonth];
      }
    } else {
      newPaidMonths = newPaidMonths.filter(m => m !== activeMonth);
    }

    const updatedTeacher: Teacher = {
      ...teacher,
      paymentStatus: newStatus,
      paidMonths: newPaidMonths,
      lastPaymentDate: newStatus === 'Paid' ? new Date().toISOString().split('T')[0] : teacher.lastPaymentDate
    };

    setTeachers(prev => prev.map(t => t.id === teacher.id ? updatedTeacher : t));

    try {
      await teachersService.update(teacher.id, updatedTeacher);
      await teachersService.updatePayment(teacher.id, newStatus);
    } catch (error) {
      console.error('Error updating teacher month status:', error);
    }
  };

  const handlePaySalary = async (teacher: Teacher) => {
    await handleUpdateTeacherMonthStatus(teacher, 'Paid');
  };

  const handleSelectTeacherMonth = async (teacher: Teacher, monthNum: number) => {
    try {
      const updated = await teachersService.update(teacher.id, {
        ...teacher,
        currentMonth: monthNum
      });
      setTeachers(prev => prev.map(t => t.id === teacher.id ? updated : t));
    } catch (err) {
      console.error('Error selecting teacher month:', err);
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

  const handleUpdateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await teachersService.update(editingTeacherId, editTeacher);
      setTeachers(prev => prev.map(t => t.id === editingTeacherId ? updated : t));
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Error updating teacher:', error);
    }
  };

  const handleViewLogs = async (teacher: Teacher) => {
    try {
      setSelectedTeacher(teacher);
      setLoadingLogs(true);
      setIsLogsModalOpen(true);
      const logs = await pointageService.getByPerson(teacher.id);
      setTeacherLogs(logs);
    } catch (error) {
      console.error('Error fetching teacher logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
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
        {activeRole === 'director' ? (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full md:w-auto bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl text-sm font-semibold shadow-lg shadow-primary/10 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            Ajouter un enseignant
          </button>
        ) : (
          <div className="flex items-center gap-2 text-xs font-black text-slate-400 bg-slate-50 border border-slate-100 px-4 py-3 rounded-2xl">
            <AlertCircle size={15} className="text-amber-500" />
            <span>La création d'enseignants est réservée au directeur</span>
          </div>
        )}
      </header>

      <div className={cn("grid grid-cols-1", isRTL && "lg:flex lg:flex-row-reverse")}>
        <div className="space-y-10 focus-within:ring-2 ring-primary/5 transition-all">
          <div className="overflow-x-auto w-full">
            <table className={cn("w-full text-left min-w-[720px]", isRTL && "text-right")}>
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                  <th className="px-8 py-5">{t('staff_member')}</th>
                  <th className="px-8 py-5">{t('subject')}</th>
                  <th className="px-8 py-5">{t('token_id')}</th>
                  <th className="px-8 py-5 text-center">{t('salary')}</th>
                  <th className="px-8 py-5 text-center">{t('payment_month')}</th>
                  <th className="px-8 py-5 text-center">{t('status')}</th>
                  <th className={cn("px-8 py-5", isRTL ? "text-left" : "text-right")}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {teachers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-8 py-20 text-center text-slate-400 font-medium">
                      Aucun enseignant trouvé
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
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-1">
                        {teacher.tokenId ? (
                          <span className="font-mono text-xs bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 px-2 py-1 rounded-md font-bold select-all">
                            {teacher.tokenId}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300 italic">
                            {t('no_token_assigned')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center text-base text-primary font-black tracking-tight">
                      {activeRole === 'director' ? (
                        `${calculateSalary(teacher.id).toLocaleString()} ${t('currency')}`
                      ) : (
                        <span className="text-slate-400 select-none text-[11px] font-black tracking-widest bg-slate-50 border border-slate-100/50 px-2 py-1 rounded-md" title="Confidentiel Directeur">•••••• DA</span>
                      )}
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="relative inline-block text-left">
                        <button
                          type="button"
                          onClick={() => setOpenMonthDropdownId(openMonthDropdownId === teacher.id ? null : teacher.id)}
                          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 shadow-2xs transition-all cursor-pointer group"
                        >
                          <Calendar size={13} className="text-primary/70 shrink-0" />
                          <span>
                            Mois {teacher.currentMonth || 1}
                          </span>
                          <ChevronDown size={13} className={cn("text-slate-400 transition-transform duration-200 group-hover:text-slate-600", openMonthDropdownId === teacher.id && "rotate-180 text-primary")} />
                        </button>

                        {openMonthDropdownId === teacher.id && (
                          <>
                            <div 
                              className="fixed inset-0 z-20" 
                              onClick={() => setOpenMonthDropdownId(null)} 
                            />
                            <div className={cn(
                              "absolute z-30 mt-1.5 w-36 py-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto animate-in fade-in zoom-in-95 duration-100",
                              isRTL ? "left-0 text-right" : "right-0 text-left"
                            )}>
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => {
                                const isSelected = (teacher.currentMonth || 1) === m;
                                return (
                                  <button
                                    key={m}
                                    type="button"
                                    onClick={() => {
                                      handleSelectTeacherMonth(teacher, m);
                                      setOpenMonthDropdownId(null);
                                    }}
                                    className={cn(
                                      "w-full px-3.5 py-2 text-xs font-medium flex items-center justify-between hover:bg-primary/5 transition-colors cursor-pointer",
                                      isSelected ? "text-primary font-bold bg-primary/10" : "text-slate-700"
                                    )}
                                  >
                                    <span>Mois {m}</span>
                                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      {(() => {
                        const activeMonth = teacher.currentMonth || 1;
                        const isPaid = (teacher.paidMonths || []).includes(activeMonth) || (teacher.paymentStatus === 'Paid' && (!teacher.paidMonths || teacher.paidMonths.length === 0));
                        const monthStatus: PaymentStatus = isPaid ? 'Paid' : 'Unpaid';

                        return (
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={() => setOpenStatusDropdownId(openStatusDropdownId === teacher.id ? null : teacher.id)}
                              className={cn(
                                "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[10px] font-black tracking-widest ring-2 ring-inset uppercase transition-all cursor-pointer hover:scale-105 active:scale-95 shadow-2xs group",
                                monthStatus === 'Paid'
                                  ? "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100"
                                  : "bg-rose-50 text-rose-700 ring-rose-200 hover:bg-rose-100"
                              )}
                              title={`Statut pour Mois ${activeMonth}`}
                            >
                              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", monthStatus === 'Paid' ? "bg-emerald-500" : "bg-rose-500")} />
                              <span>{monthStatus === 'Paid' ? t('paid') : t('pending')}</span>
                              <ChevronDown size={11} className={cn("transition-transform duration-200 opacity-60 group-hover:opacity-100", openStatusDropdownId === teacher.id && "rotate-180")} />
                            </button>

                            {openStatusDropdownId === teacher.id && (
                              <>
                                <div 
                                  className="fixed inset-0 z-20" 
                                  onClick={() => setOpenStatusDropdownId(null)} 
                                />
                                <div className={cn(
                                  "absolute z-30 mt-1.5 w-36 py-1.5 bg-white border border-slate-200 rounded-xl shadow-xl animate-in fade-in zoom-in-95 duration-100",
                                  isRTL ? "left-0 text-right" : "right-0 text-left"
                                )}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleUpdateTeacherMonthStatus(teacher, 'Paid');
                                      setOpenStatusDropdownId(null);
                                    }}
                                    className={cn(
                                      "w-full px-3.5 py-2 text-xs font-semibold flex items-center justify-between hover:bg-emerald-50 text-emerald-700 transition-colors cursor-pointer",
                                      monthStatus === 'Paid' && "bg-emerald-50/80 font-bold"
                                    )}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                      <span>{t('paid')}</span>
                                    </div>
                                    {monthStatus === 'Paid' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleUpdateTeacherMonthStatus(teacher, 'Unpaid');
                                      setOpenStatusDropdownId(null);
                                    }}
                                    className={cn(
                                      "w-full px-3.5 py-2 text-xs font-semibold flex items-center justify-between hover:bg-rose-50 text-rose-700 transition-colors cursor-pointer",
                                      monthStatus === 'Unpaid' && "bg-rose-50/80 font-bold"
                                    )}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                                      <span>{t('pending')}</span>
                                    </div>
                                    {monthStatus === 'Unpaid' && <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />}
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className={cn("px-8 py-6", isRTL ? "text-left" : "text-right")}>
                      <div className={cn("flex items-center gap-3 justify-end", isRTL && "justify-start")}>
                         <button
                           onClick={() => handleViewLogs(teacher)}
                           className="p-2 text-slate-300 hover:text-primary transition-colors"
                           title="Historique de présence"
                         >
                           <FileText size={18} />
                         </button>
                         {activeRole === 'director' ? (
                           <>
                             <button 
                               onClick={() => handlePaySalary(teacher)}
                               className="bg-slate-50 hover:bg-slate-100 text-slate-600 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-30 active:scale-95" 
                               disabled={(teacher.paidMonths || []).includes(teacher.currentMonth || 1) || (teacher.paymentStatus === 'Paid' && (!teacher.paidMonths || teacher.paidMonths.length === 0))}
                             >
                               {t('pay_salary')}
                             </button>
                             <button
                               onClick={() => {
                                 setEditingTeacherId(teacher.id);
                                 setEditTeacher({
                                   name: teacher.name,
                                   email: teacher.email,
                                   subject: teacher.subject,
                                   salary: teacher.salary,
                                   paymentStatus: teacher.paymentStatus,
                                   tokenId: teacher.tokenId || ''
                                 });
                                 setIsEditModalOpen(true);
                               }}
                               className="p-2 text-slate-300 hover:text-accent transition-colors"
                               title="Modifier l'enseignant"
                             >
                               <Pencil size={15} />
                             </button>
                             <button 
                               onClick={() => handleDeleteTeacher(teacher.id)}
                               className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                             >
                               <Trash2 size={16} />
                             </button>
                           </>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-400 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl">
                            <Shield size={12} className="text-amber-500" />
                            <span>Lecture seule</span>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Teacher Creation Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Ajouter un nouvel enseignant"
      >
        <form onSubmit={handleCreateTeacher} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Nom de l'enseignant</label>
            <input
              required
              type="text"
              value={newTeacher.name}
              onChange={e => setNewTeacher({ ...newTeacher, name: e.target.value })}
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold"
              placeholder="Nom complet"
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
              placeholder="email@ecole.com"
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
              placeholder="Ex: Mathématiques"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">{t('token_id')} (Optionnel)</label>
            <input
              type="text"
              value={newTeacher.tokenId || ''}
              onChange={e => setNewTeacher({ ...newTeacher, tokenId: e.target.value })}
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold placeholder:font-medium font-mono uppercase"
              placeholder="Ex: T201"
            />
          </div>
          <button type="submit" className="w-full bg-primary text-white p-4 rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
            Ajouter l'enseignant
          </button>
        </form>
      </Modal>

      {/* Edit Teacher Modal */}
      <Modal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        title="Modifier l'enseignant"
      >
        <form onSubmit={handleUpdateTeacher} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Nom de l'enseignant</label>
            <input
              required
              type="text"
              value={editTeacher.name}
              onChange={e => setEditTeacher({ ...editTeacher, name: e.target.value })}
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Email</label>
            <input
              required
              type="email"
              value={editTeacher.email}
              onChange={e => setEditTeacher({ ...editTeacher, email: e.target.value })}
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">{t('subject')}</label>
            <input
              required
              type="text"
              value={editTeacher.subject}
              onChange={e => setEditTeacher({ ...editTeacher, subject: e.target.value })}
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">{t('token_id')} (Optionnel)</label>
            <input
              type="text"
              value={editTeacher.tokenId || ''}
              onChange={e => setEditTeacher({ ...editTeacher, tokenId: e.target.value })}
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold placeholder:font-medium font-mono uppercase"
              placeholder="Ex: T201"
            />
          </div>
          <div className="space-y-1 flex flex-col">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">{t('status')}</label>
            <select
              value={editTeacher.paymentStatus}
              onChange={e => setEditTeacher({ ...editTeacher, paymentStatus: e.target.value as any })}
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold cursor-pointer"
            >
              <option value="Paid">{t('paid')}</option>
              <option value="Unpaid">{t('unpaid')}</option>
            </select>
          </div>
          <button type="submit" className="w-full bg-primary text-white p-4 rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
            Enregistrer les modifications
          </button>
        </form>
      </Modal>

      {/* Teacher Attendance Logs Modal */}
      <Modal
        isOpen={isLogsModalOpen}
        onClose={() => setIsLogsModalOpen(false)}
        title={`Historique de présence : ${selectedTeacher?.name}`}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-3">
              <Clock className="text-primary" size={20} />
              <span className="text-sm font-bold text-slate-600">
                Historique du mois en cours
              </span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-100">
              {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </span>
          </div>

          <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {loadingLogs ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Chargement...
                </p>
              </div>
            ) : teacherLogs.length === 0 ? (
              <div className="py-20 text-center space-y-4 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto text-slate-200 border border-slate-100">
                  <FileText size={24} />
                </div>
                <p className="text-sm font-bold text-slate-400">
                  Aucun pointage enregistré pour cet enseignant ce mois-ci
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {teacherLogs.map((log) => (
                  <div key={log.id} className="group flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                        <Calendar size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-primary">
                          {new Date(log.timestamp).toLocaleDateString('fr-FR', { 
                            weekday: 'long', 
                            day: 'numeric', 
                            month: 'short' 
                          })}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <Clock size={10} />
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                       <span className="inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase bg-primary/5 text-primary border border-primary/10">
                         {log.details || "Pointage"}
                       </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Total: {teacherLogs.length} sessions
            </div>
            <button 
              onClick={() => setIsLogsModalOpen(false)}
              className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95"
            >
              Fermer
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

