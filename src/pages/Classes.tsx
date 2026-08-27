import React, { useState, useEffect } from 'react';
import { Search, Plus, Phone, CheckCircle2, XCircle, Clock, BookOpen, Users, Loader2, Trash2, AlertCircle, Pencil, UserCheck, GraduationCap, UserPlus, Check, Printer, Calendar, CheckCheck, FileText, Sparkles, Shield, User } from 'lucide-react';
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

  // Multi-column attendance view state
  const [viewMode, setViewMode] = useState<'attendance' | 'details'>('attendance');
  const [selectedAttendanceMonth, setSelectedAttendanceMonth] = useState<number>(1);
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  const [printReceiptData, setPrintReceiptData] = useState<{
    student: Student;
    month: number;
    schoolClass?: SchoolClass;
  } | null>(null);

  const [printClassAttendanceData, setPrintClassAttendanceData] = useState<{
    schoolClass: SchoolClass;
    month: number;
    students: Student[];
    teacher?: Teacher;
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
    if (attendanceStudent && attendanceStudent.id === student.id) {
      setAttendanceStudent(updatedStudent);
    }
    
    try {
      await studentsService.update(student.id, updatedStudent);
    } catch (error) {
      console.error('Error updating attendance:', error);
    }
  };

  // Bulk Attendance: Mark ALL students in this class Present or Absent for a specific session (S1, S2, S3, or S4)
  const handleBulkSessionAttendance = async (sessionIndex: number, isPresent: boolean) => {
    if (!selectedClassId) return;
    const targetStudents = students.filter(s => {
      const studentClassIds = (s.classIds && s.classIds.length > 0) ? s.classIds : (s.classId ? [s.classId] : []);
      return studentClassIds.includes(selectedClassId);
    });
    if (targetStudents.length === 0) return;

    setIsBulkSaving(true);
    const now = new Date().toISOString();

    const updatedStudents = targetStudents.map(student => {
      const attendance = { ...(student.attendance || {}) };
      const attendanceDates = { ...(student.attendanceDates || {}) };
      const monthAttendance = [...(attendance[selectedAttendanceMonth] || [false, false, false, false])];
      const monthDates = [...(attendanceDates[selectedAttendanceMonth] || ['', '', '', ''])];

      monthAttendance[sessionIndex] = isPresent;
      monthDates[sessionIndex] = isPresent ? (monthDates[sessionIndex] || now) : '';
      attendance[selectedAttendanceMonth] = monthAttendance;
      attendanceDates[selectedAttendanceMonth] = monthDates;

      return {
        ...student,
        attendance,
        attendanceDates
      };
    });

    setStudents(prev => prev.map(s => {
      const found = updatedStudents.find(u => u.id === s.id);
      return found || s;
    }));

    try {
      await Promise.all(updatedStudents.map(s => studentsService.update(s.id, s)));
    } catch (err) {
      console.error('Error saving bulk attendance:', err);
    } finally {
      setIsBulkSaving(false);
    }
  };

  // Bulk Attendance: Mark ALL sessions (S1..S4) for ALL students in this class
  const handleBulkAllSessions = async (isPresent: boolean) => {
    if (!selectedClassId) return;
    const targetStudents = students.filter(s => {
      const studentClassIds = (s.classIds && s.classIds.length > 0) ? s.classIds : (s.classId ? [s.classId] : []);
      return studentClassIds.includes(selectedClassId);
    });
    if (targetStudents.length === 0) return;

    setIsBulkSaving(true);
    const now = new Date().toISOString();

    const updatedStudents = targetStudents.map(student => {
      const attendance = { ...(student.attendance || {}) };
      const attendanceDates = { ...(student.attendanceDates || {}) };

      attendance[selectedAttendanceMonth] = [isPresent, isPresent, isPresent, isPresent];
      attendanceDates[selectedAttendanceMonth] = isPresent ? [now, now, now, now] : ['', '', '', ''];

      return {
        ...student,
        attendance,
        attendanceDates
      };
    });

    setStudents(prev => prev.map(s => {
      const found = updatedStudents.find(u => u.id === s.id);
      return found || s;
    }));

    try {
      await Promise.all(updatedStudents.map(s => studentsService.update(s.id, s)));
    } catch (err) {
      console.error('Error saving bulk all sessions:', err);
    } finally {
      setIsBulkSaving(false);
    }
  };

  // Bulk Payment: Mark all students in class as Paid/Unpaid for the selected month
  const handleBulkMonthPayment = async (isPaid: boolean) => {
    if (!selectedClassId) return;
    const targetStudents = students.filter(s => {
      const studentClassIds = (s.classIds && s.classIds.length > 0) ? s.classIds : (s.classId ? [s.classId] : []);
      return studentClassIds.includes(selectedClassId);
    });
    if (targetStudents.length === 0) return;

    setIsBulkSaving(true);
    const updatedStudents = targetStudents.map(student => {
      const paidMonths = student.paidMonths || [];
      let updatedPaidMonths: number[];
      if (isPaid) {
        updatedPaidMonths = paidMonths.includes(selectedAttendanceMonth) ? paidMonths : [...paidMonths, selectedAttendanceMonth];
      } else {
        updatedPaidMonths = paidMonths.filter(m => m !== selectedAttendanceMonth);
      }
      return {
        ...student,
        paidMonths: updatedPaidMonths,
        paymentStatus: updatedPaidMonths.includes(student.currentMonth) ? 'Paid' : 'Unpaid' as any
      };
    });

    setStudents(prev => prev.map(s => {
      const found = updatedStudents.find(u => u.id === s.id);
      return found || s;
    }));

    try {
      await Promise.all(updatedStudents.map(s => studentsService.update(s.id, s)));
    } catch (err) {
      console.error('Error updating bulk payments:', err);
    } finally {
      setIsBulkSaving(false);
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

  const handlePrintClassAttendanceSheet = () => {
    const currentClass = classes.find(c => c.id === selectedClassId);
    if (!currentClass) return;
    const classSts = students.filter(s => {
      const studentClassIds = (s.classIds && s.classIds.length > 0) ? s.classIds : (s.classId ? [s.classId] : []);
      return studentClassIds.includes(selectedClassId);
    });
    const currentTeacher = teachers.find(t => t.id === currentClass.teacherId);
    
    setPrintClassAttendanceData({
      schoolClass: currentClass,
      month: selectedAttendanceMonth,
      students: classSts,
      teacher: currentTeacher
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
      if (attendanceStudent && attendanceStudent.id === student.id) {
        setAttendanceStudent(updatedStudent);
      }

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
                    <div className={cn(
                      "mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all",
                      selectedClassId === c.id 
                        ? "bg-white/15 text-white border border-white/20" 
                        : "bg-slate-100 text-slate-700 border border-slate-200",
                      isRTL && "flex-row-reverse"
                    )}>
                      <GraduationCap size={13} className={selectedClassId === c.id ? "text-accent" : "text-primary shrink-0"} />
                      <span className="truncate">
                        {assignedTeacher ? assignedTeacher.name : (isRTL ? "بدون أستاذ" : "Non assigné")}
                      </span>
                    </div>
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
                <div className={cn("pb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6", isRTL && "md:flex-row-reverse")}>
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
                          <span className="text-slate-300">•</span>
                          <span className="text-xs font-bold text-slate-500">
                            {classStudents.length} élève(s)
                          </span>
                        </div>
                     </div>
                  </div>
                  
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                      <Search className={cn("absolute top-1/2 -translate-y-1/2 text-slate-400", isRTL ? "right-4" : "left-4")} size={18} />
                      <input
                        type="text"
                        placeholder={t('search_student')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className={cn(
                          "w-full py-2.5 bg-slate-50 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-primary/5 outline-none transition-all placeholder:text-slate-400",
                          isRTL ? "pr-10 pl-4 text-right" : "pl-10 pr-4"
                        )}
                      />
                    </div>

                    {/* View mode toggle */}
                    <div className="flex bg-slate-100 p-1 rounded-2xl shrink-0">
                      <button
                        onClick={() => setViewMode('attendance')}
                        className={cn(
                          "px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5",
                          viewMode === 'attendance' ? "bg-primary text-white shadow-md shadow-primary/20" : "text-slate-600 hover:text-slate-900"
                        )}
                        title="Feuille de Présence Multi-Colonnes"
                      >
                        <CheckCheck size={15} />
                        <span className="hidden sm:inline">Présences</span>
                      </button>
                      <button
                        onClick={() => setViewMode('details')}
                        className={cn(
                          "px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5",
                          viewMode === 'details' ? "bg-primary text-white shadow-md shadow-primary/20" : "text-slate-600 hover:text-slate-900"
                        )}
                        title="Liste & Inscriptions"
                      >
                        <Users size={15} />
                        <span className="hidden sm:inline">Liste</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* MONTH SELECTOR & BULK ACTIONS BAR (When in Attendance Mode) */}
                {viewMode === 'attendance' && (
                  <div className="space-y-4 mb-6 bg-slate-50/70 p-4 sm:p-5 rounded-3xl border border-slate-200/80">
                    {/* 12 Months Horizontal Pills */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <Calendar size={14} className="text-primary" />
                          <span>Mois de pointage & d'assiduité :</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handlePrintClassAttendanceSheet}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-xs transition-all cursor-pointer active:scale-95"
                            title="Imprimer la feuille d'appel A4"
                          >
                            <Printer size={13} className="text-primary" />
                            <span>Imprimer Feuille d'Appel (A4)</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                        {[...Array(12)].map((_, idx) => {
                          const m = idx + 1;
                          const isSelected = selectedAttendanceMonth === m;
                          // Calculate present count for this month
                          const totalPresentThisMonth = classStudents.reduce((acc, s) => {
                            const att = (s.attendance || {})[m] || [false, false, false, false];
                            return acc + att.filter(Boolean).length;
                          }, 0);

                          return (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setSelectedAttendanceMonth(m)}
                              className={cn(
                                "px-3.5 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 shrink-0 border",
                                isSelected
                                  ? "bg-primary text-white border-primary shadow-md shadow-primary/20 scale-105"
                                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100"
                              )}
                            >
                              <span>Mois {m}</span>
                              <span className={cn(
                                "px-1.5 py-0.2 rounded-md text-[10px] font-bold",
                                isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                              )}>
                                {totalPresentThisMonth} pt
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Quick Bulk Actions for the Selected Month */}
                    <div className="pt-3 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Actions groupées (Mois {selectedAttendanceMonth}) :
                        </span>

                        <button
                          type="button"
                          disabled={isBulkSaving}
                          onClick={() => handleBulkAllSessions(true)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                          title="Marquer toutes les 4 séances de toute la classe comme présentes"
                        >
                          <CheckCheck size={14} />
                          <span>Tous Présents (S1 à S4)</span>
                        </button>

                        <button
                          type="button"
                          disabled={isBulkSaving}
                          onClick={() => handleBulkAllSessions(false)}
                          className="px-3 py-1.5 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-rose-600 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                          title="Réinitialiser le pointage du mois (tous absents)"
                        >
                          <XCircle size={14} />
                          <span>Réinitialiser (Tous Absents)</span>
                        </button>

                        <button
                          type="button"
                          disabled={isBulkSaving}
                          onClick={() => handleBulkMonthPayment(true)}
                          className="px-3 py-1.5 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                          title="Marquer tous les élèves comme ayant payé ce mois"
                        >
                          <Sparkles size={13} />
                          <span>Tous Payés</span>
                        </button>
                      </div>

                      {isBulkSaving && (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-primary animate-pulse">
                          <Loader2 size={13} className="animate-spin" />
                          <span>Enregistrement en cours...</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TABLE VIEW 1: MULTI-COLUMN ATTENDANCE GRID */}
                {viewMode === 'attendance' ? (
                  <div className="flex-1 overflow-x-auto w-full bg-white rounded-3xl border border-slate-200 shadow-sm">
                    <table className={cn("w-full text-left min-w-[850px]", isRTL && "text-right")}>
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-[0.15em]">
                          <th className="px-5 py-4 w-12 text-center">#</th>
                          <th className="px-5 py-4 min-w-[200px]">Élève</th>
                          <th className="px-4 py-4 min-w-[130px]">Téléphone</th>

                          {/* S1 Column */}
                          <th className="px-3 py-4 text-center min-w-[110px] bg-slate-100/50">
                            <div className="flex flex-col items-center gap-1">
                              <span className="font-black text-slate-800">Séance 1</span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleBulkSessionAttendance(0, true)}
                                  className="px-1.5 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded text-[9px] font-black tracking-tight"
                                  title="Marquer toute la classe Présente en S1"
                                >
                                  + Tous
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleBulkSessionAttendance(0, false)}
                                  className="px-1.5 py-0.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded text-[9px] font-black tracking-tight"
                                  title="Marquer toute la classe Absente en S1"
                                >
                                  - Tous
                                </button>
                              </div>
                            </div>
                          </th>

                          {/* S2 Column */}
                          <th className="px-3 py-4 text-center min-w-[110px]">
                            <div className="flex flex-col items-center gap-1">
                              <span className="font-black text-slate-800">Séance 2</span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleBulkSessionAttendance(1, true)}
                                  className="px-1.5 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded text-[9px] font-black tracking-tight"
                                  title="Marquer toute la classe Présente en S2"
                                >
                                  + Tous
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleBulkSessionAttendance(1, false)}
                                  className="px-1.5 py-0.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded text-[9px] font-black tracking-tight"
                                  title="Marquer toute la classe Absente en S2"
                                >
                                  - Tous
                                </button>
                              </div>
                            </div>
                          </th>

                          {/* S3 Column */}
                          <th className="px-3 py-4 text-center min-w-[110px] bg-slate-100/50">
                            <div className="flex flex-col items-center gap-1">
                              <span className="font-black text-slate-800">Séance 3</span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleBulkSessionAttendance(2, true)}
                                  className="px-1.5 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded text-[9px] font-black tracking-tight"
                                  title="Marquer toute la classe Présente en S3"
                                >
                                  + Tous
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleBulkSessionAttendance(2, false)}
                                  className="px-1.5 py-0.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded text-[9px] font-black tracking-tight"
                                  title="Marquer toute la classe Absente en S3"
                                >
                                  - Tous
                                </button>
                              </div>
                            </div>
                          </th>

                          {/* S4 Column */}
                          <th className="px-3 py-4 text-center min-w-[110px]">
                            <div className="flex flex-col items-center gap-1">
                              <span className="font-black text-slate-800">Séance 4</span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleBulkSessionAttendance(3, true)}
                                  className="px-1.5 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded text-[9px] font-black tracking-tight"
                                  title="Marquer toute la classe Présente en S4"
                                >
                                  + Tous
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleBulkSessionAttendance(3, false)}
                                  className="px-1.5 py-0.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded text-[9px] font-black tracking-tight"
                                  title="Marquer toute la classe Absente en S4"
                                >
                                  - Tous
                                </button>
                              </div>
                            </div>
                          </th>

                          <th className="px-4 py-4 text-center min-w-[100px]">Assiduité</th>
                          <th className="px-4 py-4 text-center min-w-[110px]">Paiement M{selectedAttendanceMonth}</th>
                          <th className={cn("px-5 py-4", isRTL ? "text-left" : "text-right")}>Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {classStudents.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="px-8 py-20 text-center text-slate-400 font-medium">
                              {isRTL ? "Aucun étudiant enregistré dans cette classe" : "Aucun étudiant enregistré dans cette classe"}
                            </td>
                          </tr>
                        ) : classStudents.map((s, index) => {
                          const attendanceList = (s.attendance || {})[selectedAttendanceMonth] || [false, false, false, false];
                          const datesList = (s.attendanceDates || {})[selectedAttendanceMonth] || ['', '', '', ''];
                          const isPaidThisMonth = (s.paidMonths || []).includes(selectedAttendanceMonth);
                          const totalPresent = attendanceList.filter(Boolean).length;

                          return (
                            <tr key={s.id} className="hover:bg-slate-50/70 transition-colors group">
                              {/* Index */}
                              <td className="px-5 py-4 text-center text-xs font-mono font-bold text-slate-400">
                                {index + 1}
                              </td>

                              {/* Student info */}
                              <td className="px-5 py-4">
                                <div>
                                  <p className="text-sm font-black text-slate-900 group-hover:text-primary transition-colors">{s.name}</p>
                                  {s.tokenId && (
                                    <span className="inline-block mt-0.5 font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-bold">
                                      {s.tokenId}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Phone */}
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-1.5 text-slate-600 font-bold text-xs">
                                  <Phone size={12} className="text-slate-400 shrink-0" />
                                  <span>{s.parentPhone || '—'}</span>
                                </div>
                              </td>

                              {/* 4 Attendance Toggle Cells: S1, S2, S3, S4 */}
                              {[0, 1, 2, 3].map((sessionIdx) => {
                                const isPresent = attendanceList[sessionIdx];
                                const dateStr = datesList[sessionIdx] 
                                  ? new Date(datesList[sessionIdx]).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
                                  : null;

                                return (
                                  <td key={sessionIdx} className={cn("px-3 py-4 text-center", (sessionIdx === 0 || sessionIdx === 2) && "bg-slate-50/30")}>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleAttendance(s, selectedAttendanceMonth, sessionIdx)}
                                      className={cn(
                                        "w-9 h-9 rounded-xl font-black text-xs transition-all inline-flex flex-col items-center justify-center cursor-pointer shadow-xs active:scale-90 border",
                                        isPresent
                                          ? "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600 shadow-emerald-500/20"
                                          : "bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200"
                                      )}
                                      title={`Séance ${sessionIdx + 1} : ${isPresent ? `Présent (${dateStr || 'Enregistré'})` : 'Absent (cliquez pour marquer présent)'}`}
                                    >
                                      {isPresent ? <Check size={16} className="stroke-[3]" /> : <span className="text-[11px] font-black">ABS</span>}
                                    </button>
                                  </td>
                                );
                              })}

                              {/* Total Attendance Bar */}
                              <td className="px-4 py-4 text-center">
                                <div className="inline-flex flex-col items-center gap-1">
                                  <span className={cn(
                                    "px-2.5 py-0.5 rounded-lg text-[11px] font-black border",
                                    totalPresent === 4 ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                                    totalPresent >= 2 ? "bg-amber-100 text-amber-800 border-amber-200" :
                                    "bg-slate-100 text-slate-600 border-slate-200"
                                  )}>
                                    {totalPresent}/4
                                  </span>
                                  <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                      className={cn(
                                        "h-full rounded-full transition-all",
                                        totalPresent === 4 ? "bg-emerald-500" : totalPresent >= 2 ? "bg-amber-500" : "bg-rose-500"
                                      )}
                                      style={{ width: `${(totalPresent / 4) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              </td>

                              {/* Payment Month Badge */}
                              <td className="px-4 py-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleMonthPayment(s, selectedAttendanceMonth)}
                                  className={cn(
                                    "px-3 py-1.5 rounded-xl text-xs font-black transition-all border shadow-2xs whitespace-nowrap cursor-pointer active:scale-95",
                                    isPaidThisMonth
                                      ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300"
                                      : "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200"
                                  )}
                                  title="Cliquer pour changer le statut de paiement pour ce mois"
                                >
                                  {isPaidThisMonth ? "✓ Payé" : "✕ Non Payé"}
                                </button>
                              </td>

                              {/* Actions */}
                              <td className={cn("px-5 py-4", isRTL ? "text-left" : "text-right")}>
                                <div className={cn("flex items-center gap-2 justify-end", isRTL && "justify-start")}>
                                  <button
                                    onClick={() => handlePrintMonthReceipt(s, selectedAttendanceMonth)}
                                    className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 rounded-xl transition-all"
                                    title="Imprimer le reçu de paiement"
                                  >
                                    <Printer size={15} />
                                  </button>
                                  <button
                                    onClick={() => setAttendanceStudent(s)}
                                    className="p-2 text-slate-400 hover:text-accent hover:bg-slate-100 rounded-xl transition-all"
                                    title="Voir l'historique annuel complet"
                                  >
                                    <Calendar size={15} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingStudentId(s.id);
                                      setEditStudent({ name: s.name, parentPhone: s.parentPhone, classId: s.classId, tokenId: s.tokenId || '' });
                                      setIsEditStudentModalOpen(true);
                                    }}
                                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
                                    title="Modifier l'élève"
                                  >
                                    <Pencil size={15} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* TABLE VIEW 2: STANDARD / DETAILED LIST */
                  <div className="flex-1 overflow-x-auto w-full bg-white rounded-3xl border border-slate-200 shadow-sm">
                    <table className={cn("w-full text-left min-w-[650px]", isRTL && "text-right")}>
                      <thead>
                        <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-200">
                          <th className="px-8 py-5">{t('student_name')}</th>
                          <th className="px-8 py-5">{t('parent_phone')}</th>
                          <th className="px-8 py-5">{t('token_id')}</th>
                          <th className="px-8 py-5">Mois Actuel</th>
                          <th className={cn("px-8 py-5", isRTL ? "text-left" : "text-right")}>Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {classStudents.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-medium">
                              {isRTL ? "Aucun étudiant enregistré dans cette classe" : "Aucun étudiant enregistré dans cette classe"}
                            </td>
                          </tr>
                        ) : classStudents.map((s) => {
                          return (
                          <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
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
                )}

                <div className={cn("py-8 flex flex-col md:flex-row justify-between items-center gap-6 mt-auto", isRTL && "md:flex-row-reverse")}>
                   <div className="text-[10px] md:text-sm font-black text-slate-400 uppercase tracking-[0.2em] text-center md:text-left">
                      <span className="text-primary font-black">{classStudents.length}</span> {isRTL ? "élèves inscrits" : "élèves inscrits"}
                   </div>
                   <div className="flex items-center gap-3 w-full md:w-auto">
                     <button 
                       onClick={() => setIsStudentModalOpen(true)}
                       className="w-full md:w-auto bg-primary hover:bg-primary/90 text-white px-8 py-3.5 rounded-2xl text-xs font-black transition-all shadow-xl shadow-primary/20 active:scale-95 flex items-center justify-center gap-2"
                     >
                        <UserPlus size={16} />
                        <span>{t('add_student')}</span>
                     </button>
                   </div>
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

      {/* Printable Official Class Attendance Sheet (A4) */}
      {printClassAttendanceData && (
        <div id="print-class-attendance-section" className="hidden print:block fixed inset-0 bg-white z-[99999] p-8 text-slate-900 font-sans">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white font-black flex items-center justify-center text-sm">
                  EM
                </div>
                <h1 className="text-xl font-black tracking-tight uppercase text-slate-900">
                  ÉCOLE LES MAÎTRES — FEUILLE D'ÉMARGEMENT
                </h1>
              </div>
              <p className="text-xs font-bold text-slate-600">
                Pointage officiel des présences & assiduité collective
              </p>
            </div>

            <div className="text-right">
              <span className="inline-block bg-slate-900 text-white font-black text-xs px-3.5 py-1 rounded-full uppercase tracking-wider">
                MOIS {printClassAttendanceData.month}
              </span>
              <p className="text-[11px] text-slate-500 font-bold mt-1">
                Date d'édition : {new Date().toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>

          {/* Class & Teacher Details */}
          <div className="grid grid-cols-3 gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-300 text-xs">
            <div>
              <span className="text-[10px] font-black uppercase text-slate-500 block">Classe / Cours</span>
              <span className="font-black text-sm text-slate-900">{printClassAttendanceData.schoolClass.name}</span>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-slate-500 block">Enseignant Responsable</span>
              <span className="font-black text-sm text-slate-900">{printClassAttendanceData.teacher ? printClassAttendanceData.teacher.name : 'Non assigné'}</span>
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-slate-500 block">Effectif Total</span>
              <span className="font-black text-sm text-slate-900">{printClassAttendanceData.students.length} Élève(s)</span>
            </div>
          </div>

          {/* Attendance Table */}
          <table className="w-full text-left border-collapse border border-slate-400 text-xs mb-8">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-400 text-slate-800 font-black uppercase text-[10px]">
                <th className="border border-slate-400 p-2 text-center w-8">#</th>
                <th className="border border-slate-400 p-2 min-w-[180px]">Nom & Prénom de l'Élève</th>
                <th className="border border-slate-400 p-2 w-28">Téléphone</th>
                <th className="border border-slate-400 p-2 text-center w-16">Séance 1</th>
                <th className="border border-slate-400 p-2 text-center w-16">Séance 2</th>
                <th className="border border-slate-400 p-2 text-center w-16">Séance 3</th>
                <th className="border border-slate-400 p-2 text-center w-16">Séance 4</th>
                <th className="border border-slate-400 p-2 text-center w-16">Total</th>
                <th className="border border-slate-400 p-2 text-center w-24">Paiement</th>
              </tr>
            </thead>
            <tbody>
              {printClassAttendanceData.students.map((s, idx) => {
                const att = (s.attendance || {})[printClassAttendanceData.month] || [false, false, false, false];
                const isPaid = (s.paidMonths || []).includes(printClassAttendanceData.month);
                const totalPresent = att.filter(Boolean).length;

                return (
                  <tr key={s.id} className="border-b border-slate-300">
                    <td className="border border-slate-400 p-2 text-center font-bold">{idx + 1}</td>
                    <td className="border border-slate-400 p-2 font-black text-slate-900">{s.name}</td>
                    <td className="border border-slate-400 p-2 text-slate-600 font-mono text-[11px]">{s.parentPhone || '—'}</td>
                    <td className="border border-slate-400 p-2 text-center font-bold">
                      {att[0] ? '✓ Présent' : '—'}
                    </td>
                    <td className="border border-slate-400 p-2 text-center font-bold">
                      {att[1] ? '✓ Présent' : '—'}
                    </td>
                    <td className="border border-slate-400 p-2 text-center font-bold">
                      {att[2] ? '✓ Présent' : '—'}
                    </td>
                    <td className="border border-slate-400 p-2 text-center font-bold">
                      {att[3] ? '✓ Présent' : '—'}
                    </td>
                    <td className="border border-slate-400 p-2 text-center font-black">
                      {totalPresent}/4
                    </td>
                    <td className="border border-slate-400 p-2 text-center font-bold">
                      {isPaid ? '✓ Payé' : 'Non payé'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Footer Signature */}
          <div className="flex justify-between items-end pt-4 border-t border-slate-400 text-xs">
            <div>
              <p className="font-bold text-slate-800">Visa de l'Enseignant :</p>
              <div className="border-b border-dashed border-slate-400 w-48 mt-12"></div>
            </div>
            <div>
              <p className="font-bold text-slate-800">Cachet & Signature de la Direction :</p>
              <div className="border-b border-dashed border-slate-400 w-48 mt-12"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

