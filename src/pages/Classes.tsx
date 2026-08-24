import React, { useState, useEffect } from 'react';
import { Search, Plus, Phone, CheckCircle2, XCircle, Clock, BookOpen, Users, Loader2, Trash2, AlertCircle, Pencil, UserCheck, GraduationCap, UserPlus, Check } from 'lucide-react';
import { Student, SchoolClass, Teacher } from '../types';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { classesService, studentsService, pointageService, teachersService, paymentsService } from '../services/supabaseService';
import { Modal } from '../components/Modal';

export function Classes() {
  const { t, isRTL, language } = useLanguage();
  const { activeRole } = useAuth();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [openMonthDropdownId, setOpenMonthDropdownId] = useState<string | null>(null);
  const [attendanceStudent, setAttendanceStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isEditClassModalOpen, setIsEditClassModalOpen] = useState(false);
  const [isEditStudentModalOpen, setIsEditStudentModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedStudentForPayment, setSelectedStudentForPayment] = useState<Student | null>(null);
  const [scanToken, setScanToken] = useState('');

  // Student choice / enrollment mode state
  const [studentAddMode, setStudentAddMode] = useState<'choose' | 'new'>('choose');
  const [existingStudentSearch, setExistingStudentSearch] = useState('');

  // Form states
  const [newClass, setNewClass] = useState<Omit<SchoolClass, 'id'>>({ name: '', price: 0, description: '', teacherId: '' });
  const [newStudent, setNewStudent] = useState<Omit<Student, 'id'>>({ name: '', parentPhone: '', classId: '', tokenId: '' });

  const [editingClassId, setEditingClassId] = useState<string>('');
  const [editClass, setEditClass] = useState<Omit<SchoolClass, 'id'>>({ name: '', price: 0, description: '', teacherId: '' });

  const [editingStudentId, setEditingStudentId] = useState<string>('');
  const [editStudent, setEditStudent] = useState<Omit<Student, 'id'>>({ name: '', parentPhone: '', classId: '', tokenId: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [classesData, studentsData, logsData, teachersData] = await Promise.all([
        classesService.getAll(),
        studentsService.getAll(),
        pointageService.getAll(),
        teachersService.getAll()
      ]);
      setClasses(classesData);
      setStudents(studentsData);
      setAllLogs(logsData);
      setTeachers(teachersData);
      if (classesData.length > 0 && !selectedClassId) {
        setSelectedClassId(classesData[0].id);
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleIncrementSession = async (student: Student) => {
    try {
      let { sessionsCompleted, currentMonth, paymentStatus } = student;
      
      sessionsCompleted = Math.min(sessionsCompleted + 1, 4);
      
      if (sessionsCompleted >= 4) {
        paymentStatus = 'Unpaid';
      }
      
      const updated = await studentsService.update(student.id, {
        ...student,
        sessionsCompleted,
        paymentStatus
      });
      setStudents(prev => prev.map(s => s.id === student.id ? updated : s));
    } catch (err) {
      console.error('Error incrementing session:', err);
    }
  };

  const handleUpdateStudentMonthStatus = async (student: Student, newMonth: number) => {
    const updatedStudent: Student = {
      ...student,
      currentMonth: newMonth
    };
    setStudents(prev => prev.map(s => s.id === student.id ? updatedStudent : s));
    try {
      await studentsService.update(student.id, updatedStudent);
    } catch (error) {
      console.error('Error updating student month:', error);
    }
  };

  const handleToggleAttendance = async (student: Student, month: number, sessionIndex: number) => {
    const attendance = { ...(student.attendance || {}) };
    const monthAttendance = [...(attendance[month] || [false, false, false, false])];
    monthAttendance[sessionIndex] = !monthAttendance[sessionIndex];
    attendance[month] = monthAttendance;
    
    const updatedStudent: Student = {
      ...student,
      attendance
    };
    
    setStudents(prev => prev.map(s => s.id === student.id ? updatedStudent : s));
    setAttendanceStudent(updatedStudent);
    
    try {
      await studentsService.update(student.id, updatedStudent);
    } catch (error) {
      console.error('Error updating attendance:', error);
    }
  };

  const handleToggleMonthPayment = async (student: Student, month: number) => {
    try {
      const paidMonths = student.paidMonths || [];
      const isPaid = paidMonths.includes(month);
      let updatedPaidMonths: number[];

      if (isPaid) {
        updatedPaidMonths = paidMonths.filter(m => m !== month);
      } else {
        updatedPaidMonths = [...paidMonths, month];
      }

      const isCurrentMonth = month === student.currentMonth;
      const newPaymentStatus = updatedPaidMonths.includes(student.currentMonth) ? 'Paid' : 'Unpaid';

      const updatedStudent: Student = {
        ...student,
        paidMonths: updatedPaidMonths,
        paymentStatus: isCurrentMonth ? newPaymentStatus : student.paymentStatus
      };

      setStudents(prev => prev.map(s => s.id === student.id ? updatedStudent : s));
      setAttendanceStudent(updatedStudent);

      await studentsService.update(student.id, updatedStudent);

      if (!isPaid) {
        const schoolClass = classes.find(c => c.id === student.classId);
        if (schoolClass) {
          await paymentsService.create({
            studentId: student.id,
            studentName: student.name,
            classId: student.classId,
            month: month,
            amountPaid: schoolClass.price,
            sarf: schoolClass.price * 0.5,
            sessionDates: [],
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('Error toggling month payment:', error);
    }
  };

  const handleTogglePaymentStatus = async (student: Student) => {
    try {
      let { paymentStatus, currentMonth, sessionsCompleted, paidMonths = [] } = student;
      
      if (paymentStatus !== 'Paid') {
        paymentStatus = 'Paid';
        
        // Reset sessions if they have finished the 4 sessions for the current month
        if (sessionsCompleted >= 4) {
            sessionsCompleted = 0;
        }

        if (!paidMonths.includes(currentMonth)) {
          paidMonths = [...paidMonths, currentMonth];
        }
        
        const schoolClass = classes.find(c => c.id === student.classId);
        if (schoolClass) {
          await paymentsService.create({
              studentId: student.id,
              studentName: student.name,
              classId: student.classId,
              month: currentMonth,
              amountPaid: schoolClass.price,
              sarf: schoolClass.price * 0.5,
              sessionDates: [],
              timestamp: new Date().toISOString()
          });
        }
      } else {
        paymentStatus = 'Unpaid';
        paidMonths = paidMonths.filter(m => m !== currentMonth);
      }
      
      const updated = await studentsService.update(student.id, {
        ...student,
        paymentStatus,
        paidMonths,
        sessionsCompleted
      });
      setStudents(prev => prev.map(s => s.id === student.id ? updated : s));
    } catch (err) {
      console.error('Error updating payment status:', err);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await classesService.create(newClass);
      setClasses(prev => [...prev, created]);
      setSelectedClassId(created.id);
      setIsClassModalOpen(false);
      setNewClass({ name: '', price: 0, description: '', teacherId: '' });
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
      setNewStudent({ name: '', parentPhone: '', classId: '', tokenId: '' });
    } catch (error) {
      console.error('Error creating student:', error);
    }
  };

  const handleAssignExistingStudent = async (studentId: string) => {
    const targetStudent = students.find(s => s.id === studentId);
    if (!targetStudent) return;
    try {
      const updated = await studentsService.update(targetStudent.id, {
        ...targetStudent,
        classId: selectedClassId
      });
      setStudents(prev => prev.map(s => s.id === studentId ? updated : s));
    } catch (error) {
      console.error('Error assigning student:', error);
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

  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await classesService.update(editingClassId, editClass);
      setClasses(prev => prev.map(c => c.id === editingClassId ? updated : c));
      setIsEditClassModalOpen(false);
    } catch (error) {
      console.error('Error updating class:', error);
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await studentsService.update(editingStudentId, editStudent);
      setStudents(prev => prev.map(s => s.id === editingStudentId ? updated : s));
      setIsEditStudentModalOpen(false);
    } catch (error) {
      console.error('Error updating student:', error);
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

  return (
    <div className={cn("space-y-6 animate-in", isRTL && "text-right")}>
      <header className={cn("flex flex-col md:flex-row justify-between items-start md:items-end gap-4", isRTL && "md:flex-row-reverse")}>
        <div className={cn(isRTL && "text-right")}>
          <h1 className="text-3xl font-bold text-primary tracking-tight">{t('academic_classes')}</h1>
          <p className="text-slate-500 mt-1">{t('manage_rosters')}</p>
        </div>
        {activeRole === 'director' ? (
          <button 
            onClick={() => setIsClassModalOpen(true)}
            className="w-full md:w-auto bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl text-sm font-semibold shadow-lg shadow-primary/10 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            {t('create_class')}
          </button>
        ) : (
          <div className="flex items-center gap-2 text-xs font-black text-slate-400 bg-slate-50 border border-slate-100 px-4 py-3 rounded-2xl">
            <AlertCircle size={15} className="text-amber-500" />
            <span>{isRTL ? "Créativité réservée au Dir. Mohamed" : "Class creation reserved for Director Mohamed"}</span>
          </div>
        )}
      </header>

      <div className={cn("grid grid-cols-1 lg:grid-cols-12 gap-10 pt-8 border-t border-slate-100", isRTL && "lg:flex lg:flex-row-reverse")}>
        {/* Sidebar Classes List */}
        <div className="lg:col-span-3 space-y-4">
          <h3 className={cn("text-xs font-black text-slate-400 uppercase tracking-widest px-2", isRTL && "text-right")}>{t('program_selector')}</h3>
          <div className="space-y-2">
            {classes.length === 0 ? (
              <p className="p-5 text-sm text-slate-400 italic font-medium">{isRTL ? "Aucune classe trouvée" : "No classes found"}</p>
            ) : classes.map((c) => {
              const assignedTeacher = teachers.find(t => t.id === c.teacherId);
              return (
              <div key={c.id} className="group relative">
                <button
                  onClick={() => setSelectedClassId(c.id)}
                  className={cn(
                    "w-full text-left p-5 rounded-2xl transition-all relative overflow-hidden pr-20",
                    selectedClassId === c.id 
                      ? "bg-primary text-white shadow-xl shadow-primary/20" 
                      : "bg-white text-slate-600 hover:bg-slate-50",
                    isRTL && "text-right pl-20 pr-5"
                  )}
                >
                  <div className="relative z-10">
                    <p className={cn(
                      "text-[10px] font-black uppercase tracking-[0.2em] mb-1",
                      selectedClassId === c.id ? "text-accent" : "text-slate-400"
                    )}>
                      {t('subscription')}: {c.price} {t('currency')}
                    </p>
                    <h4 className="font-black text-lg leading-tight tracking-tight">{c.name}</h4>
                    {assignedTeacher && (
                      <p className={cn("text-xs font-semibold mt-1.5 flex items-center gap-1.5", selectedClassId === c.id ? "text-white/80" : "text-slate-500", isRTL && "flex-row-reverse")}>
                        <GraduationCap size={14} className="shrink-0" />
                        <span>{assignedTeacher.name}</span>
                      </p>
                    )}
                  </div>
                </button>
                <div className={cn(
                  "absolute top-1/2 -translate-y-1/2 flex items-center gap-1 z-20",
                  isRTL ? "left-2" : "right-1"
                )}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingClassId(c.id);
                      setEditClass({ name: c.name, price: c.price, description: c.description || '', teacherId: c.teacherId || '' });
                      setIsEditClassModalOpen(true);
                    }}
                    className={cn(
                      "p-2 text-slate-400 hover:text-accent transition-all rounded-lg hover:bg-slate-100/50",
                      selectedClassId === c.id && "text-white/80 hover:text-white hover:bg-white/10"
                    )}
                    title={isRTL ? "تعديل" : "Edit"}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={(e) => handleDeleteClass(c.id, e)}
                    className={cn(
                      "p-2 text-slate-400 hover:text-rose-500 transition-all rounded-lg hover:bg-rose-50",
                      selectedClassId === c.id && "text-rose-300 hover:text-rose-100 hover:bg-white/10"
                    )}
                    title={isRTL ? "حذف الصف" : "Supprimer la classe"}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
            })}
          </div>
        </div>

        {/* Students Table for Selected Class */}
        <div className="lg:col-span-9 space-y-8">
          <div className="min-h-[500px] flex flex-col">
            {selectedClass ? (
              (() => {
                const currentTeacher = teachers.find(t => t.id === selectedClass.teacherId);
                return (
                <>
                <div className={cn("pb-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6", isRTL && "md:flex-row-reverse")}>
                  <div className={cn("flex items-center gap-6", isRTL && "flex-row-reverse")}>
                     <div className="w-12 h-12 md:w-16 md:h-16 bg-accent/10 text-accent rounded-2xl md:rounded-3xl flex items-center justify-center shrink-0">
                        <BookOpen size={24} className="md:w-8 md:h-8 shrink-0" />
                     </div>
                     <div className={cn(isRTL && "text-right")}>
                        <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                           <h2 className="text-2xl md:text-4xl font-black text-primary tracking-tighter">{selectedClass?.name}</h2>
                           <div className="flex items-center gap-1">
                             <button
                               onClick={() => {
                                 setEditingClassId(selectedClass.id);
                                 setEditClass({ name: selectedClass.name, price: selectedClass.price, description: selectedClass.description || '', teacherId: selectedClass.teacherId || '' });
                                 setIsEditClassModalOpen(true);
                               }}
                               className="text-slate-400 hover:text-accent p-1.5 rounded-lg hover:bg-slate-50 transition-all"
                               title={isRTL ? "تعديل المادة" : "Edit Class"}
                             >
                               <Pencil size={18} />
                             </button>
                             <button
                               onClick={(e) => handleDeleteClass(selectedClass.id, e)}
                               className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-all"
                               title={isRTL ? "حذف المادة" : "Delete Class"}
                             >
                               <Trash2 size={18} />
                             </button>
                           </div>
                        </div>
                        <div className={cn("flex flex-wrap items-center gap-3 mt-1.5", isRTL && "flex-row-reverse")}>
                          <p className="text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-[0.2em]">
                            {t('monthly_price')}: <span className="text-accent">{selectedClass?.price} {t('currency')}</span>
                          </p>
                          <span className="text-slate-300">•</span>
                          <div className="inline-flex items-center gap-1.5 bg-primary/5 border border-primary/10 px-3 py-1 rounded-xl text-xs font-bold text-primary">
                            <GraduationCap size={15} className="text-accent" />
                            <span>
                              {currentTeacher 
                                ? `${isRTL ? 'الأستاذ' : 'Prof'}: ${currentTeacher.name}` 
                                : (isRTL ? 'لم يتم تعيين أستاذ' : 'No teacher assigned')}
                            </span>
                          </div>
                        </div>
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
                        <th className="px-8 py-5">{t('token_id')}</th>
                        <th className="px-8 py-5">{isRTL ? "الشهر" : "Mois"}</th>
                        <th className={cn("px-8 py-5", isRTL ? "text-left" : "text-right")}>{isRTL ? "الإجراءات" : "Actions"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {classStudents.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-medium">
                            {isRTL ? "Aucun étudiant enregistré dans cette classe" : "No students registered in this class"}
                          </td>
                        </tr>
                      ) : classStudents.map((s) => {
                        return (
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
                            <div className="flex items-center gap-1">
                              {s.tokenId ? (
                                <span className="font-mono text-xs bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 px-2 py-1 rounded-md font-bold select-all">
                                  {s.tokenId}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-300 italic">
                                  {t('no_token_assigned')}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <button
                              onClick={() => setAttendanceStudent(s)}
                              className="flex items-center gap-1 font-black text-sm text-primary hover:text-accent bg-primary/10 px-3 py-1.5 rounded-lg transition-all"
                            >
                                {s.currentMonth}
                                <BookOpen size={12} className="opacity-50" />
                            </button>
                          </td>
                           <td className={cn("px-8 py-6", isRTL ? "text-left" : "text-right")}>
                             <div className={cn("flex items-center gap-4 justify-end", isRTL && "justify-start")}>
                               <button className="text-[10px] font-black text-primary hover:text-accent transition-colors underline-offset-4 hover:underline uppercase tracking-widest whitespace-nowrap">
                                 {t('print_receipt')}
                               </button>
                               <button
                                 onClick={() => {
                                   setEditingStudentId(s.id);
                                   setEditStudent({ name: s.name, parentPhone: s.parentPhone, classId: s.classId, tokenId: s.tokenId || '' });
                                   setIsEditStudentModalOpen(true);
                                 }}
                                 className="p-2 text-slate-300 hover:text-accent transition-colors"
                                 title={isRTL ? "تعديل الطالب" : "Edit Student"}
                               >
                                 <Pencil size={15} />
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
                      );
                      })}
                    </tbody>
                  </table>
                  
                  {/* Classe Pointage Section */}
                  <div className="mt-10 p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
                    <h3 className="text-lg font-black text-primary mb-6">{isRTL ? "Classe Pointage" : "Pointage de la classe"}</h3>
                    
                    <div className="mb-6">
                      <input 
                        type="text"
                        placeholder={isRTL ? "امسح الرمز هنا..." : "Scan token here..."}
                        value={scanToken}
                        onChange={(e) => {
                          const token = e.target.value;
                          setScanToken(token);
                          const student = classStudents.find(s => s.tokenId === token);
                          if (student) {
                            handleIncrementSession(student);
                            setScanToken('');
                          }
                        }}
                        className="w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary focus:border-transparent"
                        autoFocus
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {classStudents.map(s => (
                        <div key={s.id} className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <span className="font-bold text-sm text-slate-700">{s.name}</span>
                          <button
                            onClick={() => handleIncrementSession(s)}
                            className="bg-primary text-white px-4 py-2 rounded-lg text-xs font-black hover:bg-primary/90 transition-all active:scale-95"
                          >
                            {isRTL ? "إثبات الحضور" : "Pointer"}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
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
              );
            })()
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
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">
              {isRTL ? 'الأستاذ المسؤول (اختياري)' : 'Enseignant / Teacher (Optionnel)'}
            </label>
            <select
              value={newClass.teacherId || ''}
              onChange={e => setNewClass({ ...newClass, teacherId: e.target.value })}
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold cursor-pointer"
            >
              <option value="">{isRTL ? '-- اختر الأستاذ --' : '-- Choisir l\'enseignant --'}</option>
              {teachers.map(teach => (
                <option key={teach.id} value={teach.id}>{teach.name} ({teach.subject})</option>
              ))}
            </select>
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

      {/* Student Creation / Selection Modal */}
      <Modal 
        isOpen={isStudentModalOpen} 
        onClose={() => setIsStudentModalOpen(false)} 
        title={isRTL ? "إضافة طالب إلى هذا الصف" : "Inscrire un élève dans cette classe"}
      >
        <div className="space-y-5">
          {/* Tabs */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => setStudentAddMode('choose')}
              className={cn(
                "flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2",
                studentAddMode === 'choose' ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-800"
              )}
            >
              <UserCheck size={16} />
              <span>{isRTL ? "اختيار طالب مسجل" : "Choisir un élève existant"}</span>
            </button>
            <button
              type="button"
              onClick={() => setStudentAddMode('new')}
              className={cn(
                "flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2",
                studentAddMode === 'new' ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-800"
              )}
            >
              <UserPlus size={16} />
              <span>{isRTL ? "إنشاء طالب جديد" : "Créer un nouvel élève"}</span>
            </button>
          </div>

          {studentAddMode === 'choose' ? (
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className={cn("absolute top-1/2 -translate-y-1/2 text-slate-400", isRTL ? "right-3.5" : "left-3.5")} size={18} />
                <input
                  type="text"
                  value={existingStudentSearch}
                  onChange={e => setExistingStudentSearch(e.target.value)}
                  placeholder={isRTL ? "البحث عن طالب بالاسم أو الهاتف..." : "Rechercher par nom ou téléphone..."}
                  className={cn("w-full py-3 bg-slate-50 rounded-2xl text-sm font-bold border border-slate-200 outline-none focus:ring-2 focus:ring-primary/10", isRTL ? "pr-10 pl-4" : "pl-10 pr-4")}
                />
              </div>

              {/* List of candidates */}
              <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
                {(() => {
                  const availableStudents = students.filter(s => {
                    const matchesSearch = !existingStudentSearch || 
                      s.name.toLowerCase().includes(existingStudentSearch.toLowerCase()) || 
                      s.parentPhone.includes(existingStudentSearch);
                    return matchesSearch;
                  });

                  if (availableStudents.length === 0) {
                    return (
                      <div className="p-8 text-center text-slate-400 text-xs font-bold">
                        {isRTL ? "لم يتم العثور على أي طالب" : "Aucun élève trouvé"}
                      </div>
                    );
                  }

                  return availableStudents.map(st => {
                    const isAlreadyInThisClass = st.classId === selectedClassId;
                    const stClass = classes.find(c => c.id === st.classId);

                    return (
                      <div 
                        key={st.id} 
                        className={cn(
                          "p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3",
                          isAlreadyInThisClass 
                            ? "bg-emerald-50/60 border-emerald-200" 
                            : "bg-white border-slate-100 hover:border-slate-200 shadow-sm"
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-sm text-slate-800 truncate">{st.name}</p>
                          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium mt-0.5">
                            <span>📞 {st.parentPhone}</span>
                            {stClass && (
                              <span className={cn(
                                "px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider",
                                isAlreadyInThisClass ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                              )}>
                                {stClass.name}
                              </span>
                            )}
                          </div>
                        </div>

                        {isAlreadyInThisClass ? (
                          <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-600 px-3 py-1.5 bg-emerald-100/80 rounded-xl">
                            <Check size={14} />
                            <span>{isRTL ? "مسجل هنا" : "Inscrit"}</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAssignExistingStudent(st.id)}
                            className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5 shrink-0"
                          >
                            <Plus size={14} />
                            <span>{isRTL ? "إضافة للصف" : "Inscrire"}</span>
                          </button>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          ) : (
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
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">{t('token_id')} ({language === 'ar' ? 'اختياري' : 'Optionnel'})</label>
                <input
                  type="text"
                  value={newStudent.tokenId || ''}
                  onChange={e => setNewStudent({ ...newStudent, tokenId: e.target.value })}
                  className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold placeholder:font-medium font-mono uppercase"
                  placeholder="Ex: S101"
                />
              </div>
              <button type="submit" className="w-full bg-primary text-white p-4 rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                {t('add_student')}
              </button>
            </form>
          )}
        </div>
      </Modal>

      {/* Edit Class Modal */}
      <Modal 
        isOpen={isEditClassModalOpen} 
        onClose={() => setIsEditClassModalOpen(false)} 
        title={isRTL ? "تعديل الصف الدراسي" : "Edit Class"}
      >
        <form onSubmit={handleUpdateClass} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">{t('class_name')}</label>
            <input
              required
              type="text"
              value={editClass.name}
              onChange={e => setEditClass({ ...editClass, name: e.target.value })}
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">{t('monthly_price')}</label>
            <input
              required
              type="number"
              value={editClass.price}
              onChange={e => setEditClass({ ...editClass, price: Number(e.target.value) })}
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">
              {isRTL ? 'الأستاذ المسؤول' : 'Enseignant / Teacher'}
            </label>
            <select
              value={editClass.teacherId || ''}
              onChange={e => setEditClass({ ...editClass, teacherId: e.target.value })}
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold cursor-pointer"
            >
              <option value="">{isRTL ? '-- اختر الأستاذ --' : '-- Choisir l\'enseignant --'}</option>
              {teachers.map(teach => (
                <option key={teach.id} value={teach.id}>{teach.name} ({teach.subject})</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">{t('description')}</label>
            <textarea
              required
              value={editClass.description}
              onChange={e => setEditClass({ ...editClass, description: e.target.value })}
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold h-32"
            />
          </div>
          <button type="submit" className="w-full bg-primary text-white p-4 rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
            {isRTL ? "تعديل الصف" : "Update Class"}
          </button>
        </form>
      </Modal>

      {/* Edit Student Modal */}
      <Modal 
        isOpen={isEditStudentModalOpen} 
        onClose={() => setIsEditStudentModalOpen(false)} 
        title={isRTL ? "تعديل بيانات الطالب" : "Edit Student Details"}
      >
        <form onSubmit={handleUpdateStudent} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">{t('student_name')}</label>
            <input
              required
              type="text"
              value={editStudent.name}
              onChange={e => setEditStudent({ ...editStudent, name: e.target.value })}
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">{t('parent_phone')}</label>
            <input
              required
              type="tel"
              value={editStudent.parentPhone}
              onChange={e => setEditStudent({ ...editStudent, parentPhone: e.target.value })}
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">{t('token_id')} ({language === 'ar' ? 'اختياري' : 'Optionnel'})</label>
            <input
              type="text"
              value={editStudent.tokenId || ''}
              onChange={e => setEditStudent({ ...editStudent, tokenId: e.target.value })}
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold placeholder:font-medium font-mono uppercase"
              placeholder="Ex: S101"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">{isRTL ? "الفوج / الصف الدراسي" : "Class Assignment"}</label>
            <select
              value={editStudent.classId}
              onChange={e => setEditStudent({ ...editStudent, classId: e.target.value })}
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold cursor-pointer"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="w-full bg-primary text-white p-4 rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
            {isRTL ? "حفظ التعديلات" : "Update Student"}
          </button>
        </form>
      </Modal>

      {/* Attendance Modal */}
      <Modal 
        isOpen={!!attendanceStudent} 
        onClose={() => setAttendanceStudent(null)} 
        title={isRTL ? "الحضور والغياب والدفع" : "Attendance & Payment"}
      >
        {attendanceStudent && (
          <div className="space-y-2">
            <div className="grid grid-cols-6 gap-1 items-center text-left text-[10px] font-bold text-slate-500 uppercase pb-1 border-b border-slate-100">
              <div className="pl-1">{isRTL ? "الشهر" : "Month"}</div>
              {[1, 2, 3, 4].map(i => <div key={i} className="text-center">S{i}</div>)}
              <div className="text-center">{isRTL ? "الدفع" : "Payment"}</div>
            </div>
            {[...Array(12)].map((_, monthIdx) => {
               const month = monthIdx + 1;
               const monthAttendance = (attendanceStudent.attendance || {})[month] || [false, false, false, false];
               const isPaid = (attendanceStudent.paidMonths || []).includes(month);
               return (
                 <div key={month} className="grid grid-cols-6 gap-1 items-center py-0.5 border-b border-slate-50 last:border-none">
                    <div className="font-bold text-xs text-slate-700 pl-1">M {month}</div>
                    {monthAttendance.map((isPresent, sessionIdx) => (
                      <button 
                         key={sessionIdx}
                         onClick={() => handleToggleAttendance(attendanceStudent, month, sessionIdx)}
                         className={cn(
                           "w-5 h-5 rounded-full transition-all border mx-auto flex items-center justify-center", 
                           isPresent ? "bg-green-500 border-green-600" : "bg-red-500 border-red-600"
                         )}
                         title={`Session ${sessionIdx + 1}: ${isPresent ? 'Present' : 'Absent'}`}
                      />
                    ))}
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleMonthPayment(attendanceStudent, month)}
                        className={cn(
                          "px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all border shadow-xs whitespace-nowrap cursor-pointer",
                          isPaid 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" 
                            : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                        )}
                      >
                        {isPaid ? (isRTL ? "مخلص" : "Paid") : (isRTL ? "غير مخلص" : "Unpaid")}
                      </button>
                    </div>
                 </div>
               )
            })}
          </div>
        )}
      </Modal>
    </div>
  );
}

