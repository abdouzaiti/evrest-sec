import React, { useState, useEffect } from 'react';
import { Search, Plus, Phone, CheckCircle2, XCircle, Clock, BookOpen, Users, Loader2, Trash2, AlertCircle } from 'lucide-react';
import { Student, SchoolClass } from '../types';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import { classesService, studentsService } from '../services/supabaseService';
import { Modal } from '../components/Modal';

export function Classes() {
  const { t, isRTL } = useLanguage();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  // Modal states
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);

  // Form states
  const [newClass, setNewClass] = useState<Omit<SchoolClass, 'id'>>({ name: '', price: 0, description: '' });
  const [newStudent, setNewStudent] = useState<Omit<Student, 'id'>>({ name: '', parentPhone: '', paymentStatus: 'Pending', classId: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setConfigError(null);
      const [classesData, studentsData] = await Promise.all([
        classesService.getAll(),
        studentsService.getAll()
      ]);
      setClasses(classesData);
      setStudents(studentsData);
      if (classesData.length > 0 && !selectedClassId) {
        setSelectedClassId(classesData[0].id);
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      if (error.message?.includes('Supabase credentials missing')) {
        setConfigError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await classesService.create(newClass);
      setClasses(prev => [...prev, created]);
      setSelectedClassId(created.id);
      setIsClassModalOpen(false);
      setNewClass({ name: '', price: 0, description: '' });
    } catch (error) {
      console.error('Error creating class:', error);
    }
  };

  const handleDeleteClass = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(isRTL ? 'Êtes-vous sûr de vouloir supprimer cette classe ?' : 'Are you sure you want to delete this class?')) return;
    try {
      await classesService.delete(id);
      setClasses(prev => prev.filter(c => c.id !== id));
      if (selectedClassId === id) {
        setSelectedClassId(classes.find(c => c.id !== id)?.id || '');
      }
    } catch (error) {
      console.error('Error deleting class:', error);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await studentsService.create({ ...newStudent, classId: selectedClassId });
      setStudents(prev => [...prev, created]);
      setIsStudentModalOpen(false);
      setNewStudent({ name: '', parentPhone: '', paymentStatus: 'Pending', classId: '' });
    } catch (error) {
      console.error('Error creating student:', error);
    }
  };

  const toggleStudentStatus = async (student: Student) => {
    const statuses: Student['paymentStatus'][] = ['Paid', 'Unpaid', 'Pending'];
    const currentIndex = statuses.indexOf(student.paymentStatus);
    const nextStatus = statuses[(currentIndex + 1) % statuses.length];
    
    try {
      const updated = await studentsService.updateStatus(student.id, nextStatus);
      setStudents(prev => prev.map(s => s.id === student.id ? updated : s));
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm(isRTL ? 'Supprimer cet étudiant ?' : 'Delete this student?')) return;
    try {
      await studentsService.delete(id);
      setStudents(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error('Error deleting student:', error);
    }
  };

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const classStudents = students.filter(s => 
    s.classId === selectedClassId && 
    (search === '' || s.name.toLowerCase().includes(search.toLowerCase()))
  );

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
          onClick={fetchData}
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
          <h1 className="text-3xl font-bold text-primary tracking-tight">{t('academic_classes')}</h1>
          <p className="text-slate-500 mt-1">{t('manage_rosters')}</p>
        </div>
        <button 
          onClick={() => setIsClassModalOpen(true)}
          className="w-full md:w-auto bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl text-sm font-semibold shadow-lg shadow-primary/10 transition-all flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          {t('create_class')}
        </button>
      </header>

      <div className={cn("grid grid-cols-1 lg:grid-cols-12 gap-10 pt-8 border-t border-slate-100", isRTL && "lg:flex lg:flex-row-reverse")}>
        {/* Sidebar Classes List */}
        <div className="lg:col-span-3 space-y-4">
          <h3 className={cn("text-xs font-black text-slate-400 uppercase tracking-widest px-2", isRTL && "text-right")}>{t('program_selector')}</h3>
          <div className="space-y-2">
            {classes.length === 0 ? (
              <p className="p-5 text-sm text-slate-400 italic font-medium">{isRTL ? "Aucune classe trouvée" : "No classes found"}</p>
            ) : classes.map((c) => (
              <div key={c.id} className="group relative">
                <button
                  onClick={() => setSelectedClassId(c.id)}
                  className={cn(
                    "w-full text-left p-5 rounded-2xl transition-all relative overflow-hidden pr-12",
                    selectedClassId === c.id 
                      ? "bg-primary text-white shadow-xl shadow-primary/20" 
                      : "bg-white text-slate-600 hover:bg-slate-50",
                    isRTL && "text-right pl-12 pr-5"
                  )}
                >
                  <div className="relative z-10">
                    <p className={cn(
                      "text-[10px] font-black uppercase tracking-[0.2em] mb-2",
                      selectedClassId === c.id ? "text-accent" : "text-slate-400"
                    )}>
                      {t('subscription')}: {c.price} {t('currency')}
                    </p>
                    <h4 className="font-black text-lg leading-tight tracking-tight">{c.name}</h4>
                  </div>
                </button>
                <button
                  onClick={(e) => handleDeleteClass(c.id, e)}
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all z-20",
                    isRTL ? "left-2" : "right-2",
                    selectedClassId === c.id && "text-white/40 hover:text-white"
                  )}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Students Table for Selected Class */}
        <div className="lg:col-span-9 space-y-8">
          <div className="min-h-[500px] flex flex-col">
            {selectedClass ? (
              <>
                <div className={cn("pb-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6", isRTL && "md:flex-row-reverse")}>
                  <div className={cn("flex items-center gap-6", isRTL && "flex-row-reverse")}>
                     <div className="w-12 h-12 md:w-16 md:h-16 bg-accent/10 text-accent rounded-2xl md:rounded-3xl flex items-center justify-center shrink-0">
                        <BookOpen size={24} className="md:w-8 md:h-8" />
                     </div>
                     <div className={cn(isRTL && "text-right")}>
                        <h2 className="text-2xl md:text-4xl font-black text-primary tracking-tighter">{selectedClass?.name}</h2>
                        <p className="text-[10px] md:text-sm text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">
                          {t('monthly_price')}: <span className="text-accent">{selectedClass?.price} {t('currency')}</span>
                        </p>
                     </div>
                  </div>
                  
                  <div className="relative w-full md:w-80">
                    <Search className={cn("absolute top-1/2 -translate-y-1/2 text-slate-400", isRTL ? "right-4" : "left-4")} size={18} />
                    <input
                      type="text"
                      placeholder={t('search_student')}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className={cn(
                        "w-full py-3.5 bg-slate-50 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/5 outline-none transition-all placeholder:text-slate-400",
                        isRTL ? "pr-12 pl-4 text-right" : "pl-12 pr-4"
                      )}
                    />
                  </div>
                </div>

                <div className="flex-1">
                  <table className={cn("w-full text-left", isRTL && "text-right")}>
                    <thead>
                      <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                        <th className="px-8 py-5">{t('student_name')}</th>
                        <th className="px-8 py-5">{t('parent_phone')}</th>
                        <th className="px-8 py-5">{t('status')}</th>
                        <th className={cn("px-8 py-5", isRTL ? "text-left" : "text-right")}>{isRTL ? "الإجراءات" : "Actions"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {classStudents.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-8 py-20 text-center text-slate-400 font-medium">
                            {isRTL ? "Aucun étudiant enregistré dans cette classe" : "No students registered in this class"}
                          </td>
                        </tr>
                      ) : classStudents.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/20 transition-colors group">
                          <td className="px-8 py-6">
                             <p className="text-base font-black text-primary group-hover:text-accent transition-colors">{s.name}</p>
                          </td>
                          <td className="px-8 py-6">
                            <div className={cn("flex items-center gap-2 text-slate-500 font-black text-sm", isRTL && "flex-row-reverse text-right")}>
                              <Phone size={14} className="text-accent" />
                              <span>{s.parentPhone}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <button 
                              onClick={() => toggleStudentStatus(s)}
                              className={cn(
                                "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black ring-2 ring-inset transition-all cursor-pointer hover:opacity-80 active:scale-95",
                                s.paymentStatus === 'Paid' ? "bg-emerald-50 text-emerald-700 ring-emerald-100" :
                                s.paymentStatus === 'Unpaid' ? "bg-rose-50 text-rose-700 ring-rose-100" :
                                "bg-amber-50 text-amber-700 ring-amber-100"
                              )}
                            >
                              {s.paymentStatus === 'Paid' ? <CheckCircle2 size={14} /> :
                               s.paymentStatus === 'Unpaid' ? <XCircle size={14} /> : <Clock size={14} />}
                              {s.paymentStatus === 'Paid' ? t('paid') : s.paymentStatus === 'Unpaid' ? t('unpaid') : t('pending')}
                            </button>
                          </td>
                          <td className={cn("px-8 py-6", isRTL ? "text-left" : "text-right")}>
                            <div className={cn("flex items-center gap-4 justify-end", isRTL && "justify-start")}>
                              <button className="text-[10px] font-black text-primary hover:text-accent transition-colors underline-offset-4 hover:underline uppercase tracking-widest whitespace-nowrap">
                                {t('print_receipt')}
                              </button>
                              <button 
                                onClick={() => handleDeleteStudent(s.id)}
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

                <div className={cn("py-12 flex flex-col md:flex-row justify-between items-center gap-8 mt-auto", isRTL && "md:flex-row-reverse")}>
                   <div className="text-[10px] md:text-sm font-black text-slate-400 uppercase tracking-[0.2em] text-center md:text-left">
                      <span className="text-primary">{classStudents.length}</span> {isRTL ? "طلاب نشطين" : "active students enrolled"}
                   </div>
                   <button 
                     onClick={() => setIsStudentModalOpen(true)}
                     className="w-full md:w-auto bg-primary hover:bg-primary/90 text-white px-10 py-4 rounded-2xl text-sm font-black transition-all shadow-2xl shadow-primary/30 active:scale-95"
                   >
                      {t('add_student')}
                   </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4">
                <Users size={64} className="opacity-20" />
                <p className="font-black uppercase tracking-widest text-sm">{isRTL ? "Sélectionnez une classe pour voir les étudiants" : "Select a class to view students"}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Class Creation Modal */}
      <Modal 
        isOpen={isClassModalOpen} 
        onClose={() => setIsClassModalOpen(false)} 
        title={t('create_class')}
      >
        <form onSubmit={handleCreateClass} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">{t('class_name')}</label>
            <input
              required
              type="text"
              value={newClass.name}
              onChange={e => setNewClass({ ...newClass, name: e.target.value })}
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold"
              placeholder="e.g. Mathematics Grade 10"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">{t('monthly_price')}</label>
            <input
              required
              type="number"
              value={newClass.price}
              onChange={e => setNewClass({ ...newClass, price: Number(e.target.value) })}
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold"
              placeholder="4500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">{t('description')}</label>
            <textarea
              required
              value={newClass.description}
              onChange={e => setNewClass({ ...newClass, description: e.target.value })}
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold h-32"
              placeholder="Class details..."
            />
          </div>
          <button type="submit" className="w-full bg-primary text-white p-4 rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
            {t('create_class')}
          </button>
        </form>
      </Modal>

      {/* Student Creation Modal */}
      <Modal 
        isOpen={isStudentModalOpen} 
        onClose={() => setIsStudentModalOpen(false)} 
        title={t('add_student')}
      >
        <form onSubmit={handleCreateStudent} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">{t('student_name')}</label>
            <input
              required
              type="text"
              value={newStudent.name}
              onChange={e => setNewStudent({ ...newStudent, name: e.target.value })}
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold"
              placeholder="Full Name"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">{t('parent_phone')}</label>
            <input
              required
              type="tel"
              value={newStudent.parentPhone}
              onChange={e => setNewStudent({ ...newStudent, parentPhone: e.target.value })}
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold"
              placeholder="0550..."
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">{t('status')}</label>
            <select
              value={newStudent.paymentStatus}
              onChange={e => setNewStudent({ ...newStudent, paymentStatus: e.target.value as any })}
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold appearance-none cursor-pointer"
            >
              <option value="Paid">{t('paid')}</option>
              <option value="Unpaid">{t('unpaid')}</option>
              <option value="Pending">{t('pending')}</option>
            </select>
          </div>
          <button type="submit" className="w-full bg-primary text-white p-4 rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
            {t('add_student')}
          </button>
        </form>
      </Modal>
    </div>
  );
}

