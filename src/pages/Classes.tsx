import React, { useState, useEffect } from 'react';
import { Search, Plus, Phone, CheckCircle2, XCircle, Clock, BookOpen, Users, Loader2, Trash2, AlertCircle, Pencil, UserCheck, GraduationCap, UserPlus, Check, Printer } from 'lucide-react';
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
  const [printReceiptData, setPrintReceiptData] = useState<{
    student: Student;
    month: number;
    schoolClass?: SchoolClass;
  } | null>(null);

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
    const attendanceDates = { ...(student.attendanceDates || {}) };
    const monthAttendance = [...(attendance[month] || [false, false, false, false])];
    const monthDates = [...(attendanceDates[month] || ['', '', '', ''])];
    
    const nextState = !monthAttendance[sessionIndex];
    monthAttendance[sessionIndex] = nextState;
    monthDates[sessionIndex] = nextState ? new Date().toISOString() : '';
    attendance[month] = monthAttendance;
    attendanceDates[month] = monthDates;
    
    const updatedStudent: Student = {
      ...student,
      attendance,
      attendanceDates
    };
    
    setStudents(prev => prev.map(s => s.id === student.id ? updatedStudent : s));
    setAttendanceStudent(updatedStudent);
    
    try {
      await studentsService.update(student.id, updatedStudent);
    } catch (error) {
      console.error('Error updating attendance:', error);
    }
  };

  const handlePrintMonthReceipt = (student: Student, month: number) => {
    const currentClass = classes.find(c => c.id === (student.classId || selectedClassId)) || undefined;
    setPrintReceiptData({
      student,
      month,
      schoolClass: currentClass
    });
    setTimeout(() => {
      window.print();
    }, 150);
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
      const created = await studentsService.create({ 
        ...newStudent, 
        classId: selectedClassId,
        classIds: [selectedClassId]
      });
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
      const currentClassIds = (targetStudent.classIds && targetStudent.classIds.length > 0)
        ? targetStudent.classIds
        : (targetStudent.classId ? [targetStudent.classId] : []);
      
      const newClassIds = currentClassIds.includes(selectedClassId)
        ? currentClassIds
        : [...currentClassIds, selectedClassId];

      const updated = await studentsService.update(targetStudent.id, {
        ...targetStudent,
        classId: targetStudent.classId || selectedClassId,
        classIds: newClassIds
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
  const classStudents = students.filter(s => {
    const studentClassIds = (s.classIds && s.classIds.length > 0)
      ? s.classIds
      : (s.classId ? [s.classId] : []);
    const inThisClass = studentClassIds.includes(selectedClassId);
    return inThisClass && (search === '' || s.name.toLowerCase().includes(search.toLowerCase()));
  });

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
        <div className="">
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
            <span>Class creation reserved for Director Mohamed</span>
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
                    title={isRTL ? "Modifier" : "Modifier"}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={(e) => handleDeleteClass(c.id, e)}
                    className={cn(
                      "p-2 text-slate-400 hover:text-rose-500 transition-all rounded-lg hover:bg-rose-50",
                      selectedClassId === c.id && "text-rose-300 hover:text-rose-100 hover:bg-white/10"
                    )}
                    title={isRTL ? "Supprimer la classe" : "Supprimer la classe"}
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
                               title={isRTL ? "Modifier le cours" : "Modifier le cours"}
                             >
                               <Pencil size={18} />
                             </button>
                             <button
                               onClick={(e) => handleDeleteClass(selectedClass.id, e)}
                               className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-all"
                               title={isRTL ? "Supprimer le cours" : "Supprimer le cours"}
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
                                ? `Prof: ${currentTeacher.name}` 
                                : 'Aucun enseignant assigné'}
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

                <div className="flex-1 overflow-x-auto w-full">
                  <table className={cn("w-full text-left min-w-[650px]", isRTL && "text-right")}>
                    <thead>
                      <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                        <th className="px-8 py-5">{t('student_name')}</th>
                        <th className="px-8 py-5">{t('parent_phone')}</th>
                        <th className="px-8 py-5">{t('token_id')}</th>
                        <th className="px-8 py-5">{isRTL ? "Mois" : "Mois"}</th>
                        <th className={cn("px-8 py-5", isRTL ? "text-left" : "text-right")}>{isRTL ? "Actions" : "Actions"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {classStudents.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-medium">
                            {isRTL ? "Aucun étudiant enregistré dans cette classe" : "Aucun étudiant enregistré dans cette classe"}
                          </td>
                        </tr>
                      ) : classStudents.map((s) => {
                        return (
                        <tr key={s.id} className="hover:bg-slate-50/20 transition-colors group">
                          <td className="px-8 py-6">
                             <p className="text-base font-black text-primary group-hover:text-accent transition-colors">{s.name}</p>
                          </td>
                          <td className="px-8 py-6">
                            <div className="space-y-1.5">
                              <div className={cn("flex items-center gap-2 text-slate-500 font-black text-sm", isRTL && "flex-row-reverse text-right")}>
                                <Phone size={14} className="text-accent" />
                                <span>{s.parentPhone}</span>
                              </div>
                              <div className={cn("flex flex-wrap items-center gap-1 max-w-[260px]", isRTL && "justify-end")}>
                                {(() => {
                                  const studentClassIds = (s.classIds && s.classIds.length > 0)
                                    ? s.classIds
                                    : (s.classId ? [s.classId] : []);
                                  return studentClassIds.map(cid => {
                                    const found = classes.find(c => c.id === cid);
                                    const isCurrent = cid === selectedClassId;
                                    return (
                                      <span
                                        key={cid}
                                        className={cn(
                                          "inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border",
                                          isCurrent
                                            ? "bg-primary/10 text-primary border-primary/20"
                                            : "bg-slate-100 text-slate-600 border-slate-200"
                                        )}
                                      >
                                        {found ? found.name : 'Classe'}
                                      </span>
                                    );
                                  });
                                })()}
                              </div>
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
                               <button 
                                 onClick={() => handlePrintMonthReceipt(s, s.currentMonth)}
                                 className="flex items-center gap-1.5 text-[10px] font-black text-primary hover:text-accent transition-colors underline-offset-4 hover:underline uppercase tracking-widest whitespace-nowrap cursor-pointer"
                                 title="Imprimer le reçu"
                               >
                                 <Printer size={12} />
                                 {t('print_receipt')}
                               </button>
                               <button
                                 onClick={() => {
                                   setEditingStudentId(s.id);
                                   setEditStudent({ name: s.name, parentPhone: s.parentPhone, classId: s.classId, tokenId: s.tokenId || '' });
                                   setIsEditStudentModalOpen(true);
                                 }}
                                 className="p-2 text-slate-300 hover:text-accent transition-colors"
                                 title={isRTL ? "Modifier l'étudiant" : "Modifier l'étudiant"}
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
                </div>

                <div className={cn("py-12 flex flex-col md:flex-row justify-between items-center gap-8 mt-auto", isRTL && "md:flex-row-reverse")}>
                   <div className="text-[10px] md:text-sm font-black text-slate-400 uppercase tracking-[0.2em] text-center md:text-left">
                      <span className="text-primary">{classStudents.length}</span> {isRTL ? "élèves inscrits" : "élèves inscrits"}
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
        title="Inscrire un élève dans cette classe"
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
              <span>Choisir un élève existant</span>
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
              <span>Créer un nouvel élève</span>
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
                  placeholder="Rechercher par nom ou téléphone..."
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
                        Aucun élève trouvé
                      </div>
                    );
                  }

                  return availableStudents.map(st => {
                    const studentClassIds = (st.classIds && st.classIds.length > 0)
                      ? st.classIds
                      : (st.classId ? [st.classId] : []);
                    const isAlreadyInThisClass = studentClassIds.includes(selectedClassId);
                    const enrolledClasses = studentClassIds.map(cid => classes.find(c => c.id === cid)).filter(Boolean) as SchoolClass[];

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
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400 font-medium mt-1">
                            <span>📞 {st.parentPhone}</span>
                            {enrolledClasses.map(cl => (
                              <span key={cl.id} className={cn(
                                "px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider",
                                cl.id === selectedClassId ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-slate-100 text-slate-600 border border-slate-200"
                              )}>
                                {cl.name}
                              </span>
                            ))}
                          </div>
                        </div>

                        {isAlreadyInThisClass ? (
                          <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-600 px-3 py-1.5 bg-emerald-100/80 rounded-xl">
                            <Check size={14} />
                            <span>Inscrit</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAssignExistingStudent(st.id)}
                            className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5 shrink-0"
                          >
                            <Plus size={14} />
                            <span>Inscrire</span>
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
                  placeholder="Nom complet"
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
                <label className="text-xs font-black uppercase tracking-widest text-slate-400">{t('token_id')} (Optionnel)</label>
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
        title="Modifier la classe"
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
              Enseignant / Prof (Optionnel)
            </label>
            <select
              value={editClass.teacherId || ''}
              onChange={e => setEditClass({ ...editClass, teacherId: e.target.value })}
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold cursor-pointer"
            >
              <option value="">-- Choisir l'enseignant --</option>
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
            Enregistrer les modifications
          </button>
        </form>
      </Modal>

      {/* Edit Student Modal */}
      <Modal 
        isOpen={isEditStudentModalOpen} 
        onClose={() => setIsEditStudentModalOpen(false)} 
        title="Modifier l'élève"
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
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">{t('token_id')} (Optionnel)</label>
            <input
              type="text"
              value={editStudent.tokenId || ''}
              onChange={e => setEditStudent({ ...editStudent, tokenId: e.target.value })}
              className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/5 transition-all font-bold placeholder:font-medium font-mono uppercase"
              placeholder="Ex: S101"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Classe</label>
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
            Enregistrer les modifications
          </button>
        </form>
      </Modal>

      {/* Attendance Modal */}
      <Modal 
        isOpen={!!attendanceStudent} 
        onClose={() => setAttendanceStudent(null)} 
        title="Présences & Paiement"
      >
        {attendanceStudent && (
          <div className="space-y-2">
            <div className="grid grid-cols-6 gap-2 items-center text-left text-[10px] font-bold text-slate-500 uppercase pb-1 border-b border-slate-100">
              <div className="pl-1 font-black">Mois</div>
              {[1, 2, 3, 4].map(i => <div key={i} className="text-center font-black">S{i}</div>)}
              <div className="text-center font-black">Paiement & Reçu</div>
            </div>
            {[...Array(12)].map((_, monthIdx) => {
               const month = monthIdx + 1;
               const monthAttendance = (attendanceStudent.attendance || {})[month] || [false, false, false, false];
               const monthDates = (attendanceStudent.attendanceDates || {})[month] || ['', '', '', ''];
               const isPaid = (attendanceStudent.paidMonths || []).includes(month);
               return (
                 <div key={month} className="grid grid-cols-6 gap-2 items-center py-1.5 border-b border-slate-100 last:border-none hover:bg-slate-50/50 rounded-lg px-1 transition-colors">
                    <div className="font-black text-xs text-slate-800 pl-1">M {month}</div>
                    {monthAttendance.map((isPresent, sessionIdx) => {
                      const dateStr = monthDates[sessionIdx] 
                        ? new Date(monthDates[sessionIdx]).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
                        : null;
                      return (
                        <button 
                           key={sessionIdx}
                           type="button"
                           onClick={() => handleToggleAttendance(attendanceStudent, month, sessionIdx)}
                           className={cn(
                             "w-5 h-5 rounded-full transition-all border mx-auto flex items-center justify-center cursor-pointer hover:scale-125 shadow-2xs", 
                             isPresent ? "bg-green-500 border-green-600 shadow-green-500/20" : "bg-red-500 border-red-600 shadow-red-500/20"
                           )}
                           title={`Séance ${sessionIdx + 1}: ${isPresent ? (dateStr ? `Présent (${dateStr})` : 'Présent') : 'Absent'}`}
                        />
                      );
                    })}
                    <div className="text-center flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleToggleMonthPayment(attendanceStudent, month)}
                        className={cn(
                          "px-2 py-0.5 rounded-md text-[10px] font-bold transition-all border shadow-2xs whitespace-nowrap cursor-pointer",
                          isPaid 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" 
                            : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                        )}
                      >
                        {isPaid ? "Payé" : "Non payé"}
                      </button>
                      {isPaid && (
                        <button
                          type="button"
                          onClick={() => handlePrintMonthReceipt(attendanceStudent, month)}
                          className="p-1 rounded-md bg-slate-100 hover:bg-primary hover:text-white text-slate-600 transition-all border border-slate-200 shadow-2xs cursor-pointer active:scale-90"
                          title="Imprimer le reçu de paiement de ce mois"
                        >
                          <Printer size={11} />
                        </button>
                      )}
                    </div>
                 </div>
               )
            })}
          </div>
        )}
      </Modal>

      {/* Printable Official Payment Receipt (Single Month) */}
      {printReceiptData && (
        <div id="print-receipt-section" className="hidden print:block w-full bg-white text-slate-900 font-sans p-2">
          {/* Logo & Institution Header */}
          <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-300">
            <div className="flex items-center gap-4">
              <img 
                src="/logo.png" 
                alt="Logo" 
                className="h-20 max-h-20 w-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div>
                <h1 className="text-2xl font-black uppercase tracking-wider text-slate-900">REÇU DE PAIEMENT</h1>
                <p className="text-xs font-semibold text-slate-500 tracking-wide mt-0.5">Centre & Académie de Soutien Scolaire</p>
              </div>
            </div>

            <div className="text-right space-y-1">
              <span className="inline-block bg-emerald-600 text-white font-black text-xs px-3.5 py-1 rounded-full uppercase tracking-wider">
                PAYÉ
              </span>
              <p className="text-xs font-bold text-slate-700 font-mono mt-1">
                REC-M{printReceiptData.month}-{printReceiptData.student.id.slice(0, 6).toUpperCase()}
              </p>
              <p className="text-[11px] text-slate-500 font-medium">
                {new Date().toLocaleDateString('fr-FR')} {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          {/* Student & Class Information Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <div className="space-y-1">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Nom & Prénom de l'Élève</p>
              <p className="font-black text-base text-slate-900">{printReceiptData.student.name}</p>
              {printReceiptData.student.parentPhone && (
                <p className="text-xs font-semibold text-slate-600 pt-1">
                  <span className="text-slate-400 font-bold">Contact: </span>
                  {printReceiptData.student.parentPhone}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Classe & Matière</p>
              <p className="font-black text-base text-slate-900">{printReceiptData.schoolClass?.name || 'Classe'}</p>
              {printReceiptData.schoolClass?.description && (
                <p className="text-xs font-semibold text-slate-600 pt-1">{printReceiptData.schoolClass.description}</p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Période Réglée</p>
              <p className="font-black text-sm text-primary mt-0.5">Mois {printReceiptData.month}</p>
            </div>

            <div className="pt-3 border-t border-slate-200">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Statut de la transaction</p>
              <p className="font-bold text-xs text-emerald-700 mt-0.5 flex items-center gap-1">
                <span>●</span> Règlement Validé & Enregistré
              </p>
            </div>
          </div>

          {/* 4 Sessions Detail for THIS Month */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Assiduité & Pointage des 4 Séances (Mois {printReceiptData.month})
              </h3>
              <span className="text-[11px] font-semibold text-slate-500">4 séances / mois</span>
            </div>
            
            <div className="space-y-2">
              {[0, 1, 2, 3].map((sessionIdx) => {
                const attendanceList = (printReceiptData.student.attendance || {})[printReceiptData.month] || [false, false, false, false];
                const datesList = (printReceiptData.student.attendanceDates || {})[printReceiptData.month] || ['', '', '', ''];
                const isPresent = attendanceList[sessionIdx];
                const dateStr = datesList[sessionIdx] 
                  ? new Date(datesList[sessionIdx]).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
                  : null;

                return (
                  <div key={sessionIdx} className="flex justify-between items-center px-4 py-3 rounded-xl border border-slate-200 bg-white">
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "w-7 h-7 rounded-full font-black text-xs flex items-center justify-center border",
                        isPresent ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-slate-100 text-slate-600 border-slate-300"
                      )}>
                        S{sessionIdx + 1}
                      </span>
                      <div>
                        <p className="font-bold text-xs text-slate-800">
                          Séance {sessionIdx + 1}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {isPresent ? "Séance effectuée" : "En attente / Absente"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-xs text-slate-500 font-mono">
                        {dateStr ? dateStr : (isPresent ? 'Pointage enregistré' : '—')}
                      </span>
                      <span className={cn(
                        "px-3 py-1 text-[10px] font-black rounded-full border tracking-wider uppercase",
                        isPresent 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300" 
                          : "bg-rose-50 text-rose-700 border-rose-300"
                      )}>
                        {isPresent ? "PRÉSENT" : "ABSENT"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Prominent Class Total Price Section at the bottom */}
          <div className="bg-slate-900 text-white px-6 py-5 rounded-2xl mb-8 flex justify-between items-center shadow-xs">
            <div>
              <p className="text-[11px] uppercase font-black tracking-widest text-slate-400">PRIX TOTAL DE LA CLASSE</p>
              <p className="text-xs text-slate-300 font-medium mt-0.5">Montant réglé pour le Mois {printReceiptData.month}</p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black tracking-tight text-emerald-400">
                {(printReceiptData.schoolClass?.price || 0).toLocaleString()} DZD
              </span>
            </div>
          </div>

          {/* Footer Signature & Stamp */}
          <div className="border-t border-slate-300 pt-6 flex justify-between items-end text-xs">
            <div className="space-y-1">
              <p className="font-black text-slate-800 uppercase tracking-wide text-xs">Administration & Direction</p>
              <p className="text-[11px] text-slate-500 italic">Document officiel servant de preuve de paiement.</p>
            </div>
            <div className="text-center">
              <p className="text-[11px] font-black uppercase text-slate-500 mb-12">Cachet & Signature de l'établissement</p>
              <div className="border-b-2 border-dashed border-slate-400 w-48"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

