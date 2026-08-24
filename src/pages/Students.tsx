import React, { useState, useEffect } from 'react';
import { Search, Plus, User, Phone, CreditCard, GraduationCap, Loader2, Trash2, Shield, Pencil, AlertCircle, CheckCircle2, Circle, Clock, FileText, Calendar } from 'lucide-react';
import { Student, SchoolClass, PointageLog } from '../types';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { studentsService, classesService, pointageService } from '../services/supabaseService';
import { Modal } from '../components/Modal';
import { motion } from 'motion/react';

export function Students() {
  const { t, isRTL } = useLanguage();
  const { activeRole } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [allLogs, setAllLogs] = useState<PointageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentLogs, setStudentLogs] = useState<PointageLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  
  const [newStudent, setNewStudent] = useState<Omit<Student, 'id'>>({
    name: '',
    parentPhone: '',
    paymentStatus: 'Pending',
    classId: '',
    tokenId: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [studentsData, classesData, logsData] = await Promise.all([
        studentsService.getAll(),
        classesService.getAll(),
        pointageService.getAll()
      ]);
      setStudents(studentsData);
      setClasses(classesData);
      setAllLogs(logsData);
    } catch (error) {
      console.error('Error loading students data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await studentsService.create(newStudent);
      setIsModalOpen(false);
      setNewStudent({ name: '', parentPhone: '', paymentStatus: 'Pending', classId: '', tokenId: '' });
      loadData();
    } catch (error) {
      console.error('Error creating student:', error);
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    try {
      await studentsService.update(selectedStudent.id, selectedStudent);
      setIsEditModalOpen(false);
      setSelectedStudent(null);
      loadData();
    } catch (error) {
      console.error('Error updating student:', error);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!window.confirm(isRTL ? 'هل أنت متأكد من حذف هذا الطالب؟' : 'Are you sure you want to delete this student?')) return;
    try {
      await studentsService.delete(id);
      loadData();
    } catch (error) {
      console.error('Error deleting student:', error);
    }
  };

  const handleViewLogs = async (student: Student) => {
    try {
      setSelectedStudent(student);
      setLoadingLogs(true);
      setIsLogsModalOpen(true);
      const logs = await pointageService.getByPerson(student.id);
      setStudentLogs(logs);
    } catch (error) {
      console.error('Error fetching student logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.parentPhone.includes(searchQuery) ||
    (student.tokenId && student.tokenId.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getClassBadge = (classId: string) => {
    const studentClass = classes.find(c => c.id === classId);
    return studentClass ? studentClass.name : (isRTL ? 'غير معروف' : 'Unknown');
  };

  // Calculate sessions for current month
  const getSessionCount = (studentId: string) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return allLogs.filter(log => {
      const logDate = new Date(log.timestamp);
      return log.personId === studentId && 
             logDate.getMonth() === currentMonth && 
             logDate.getFullYear() === currentYear;
    }).length;
  };

  const handleToggleSessionTrigger = async (student: Student, targetSession: number) => {
    try {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const studentMonthLogs = allLogs.filter(log => {
        const logDate = new Date(log.timestamp);
        return log.personId === student.id && 
               logDate.getMonth() === currentMonth && 
               logDate.getFullYear() === currentYear;
      }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const currentCount = studentMonthLogs.length;

      if (targetSession <= currentCount) {
        // Uncheck or reduce sessions down to targetSession - 1
        const logsToRemoveCount = currentCount - (targetSession - 1);
        for (let i = 0; i < logsToRemoveCount; i++) {
          if (studentMonthLogs[i]) {
            await pointageService.deleteLog(studentMonthLogs[i].id);
          }
        }
      } else {
        // Add sessions up to targetSession
        const logsToAddCount = targetSession - currentCount;
        for (let i = 0; i < logsToAddCount; i++) {
          const sessionNum = currentCount + i + 1;
          await pointageService.log({
            personId: student.id,
            personType: 'student',
            personName: student.name,
            tokenId: student.tokenId || 'S-MANUAL',
            details: `Manual session trigger #${sessionNum}`
          });
        }
      }
      loadData();
    } catch (err) {
      console.error('Error updating session trigger:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-sm font-black uppercase tracking-widest text-slate-400">
          {isRTL ? 'جاري تحميل قائمة الطلاب...' : 'Loading student directory...'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 text-primary rounded-2xl">
              <GraduationCap size={24} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              {t('students')}
            </h1>
          </div>
          <p className="text-slate-500 font-medium max-w-md leading-relaxed">
            {t('manage_students')}
          </p>
        </div>

        {activeRole === 'director' && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-primary text-white px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-primary/90 transition-all hover:shadow-xl hover:shadow-primary/20 active:scale-95 group"
          >
            <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
            {t('add_student')}
          </button>
        )}
      </div>

      {/* Stats and Search */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
        <div className="lg:col-span-3 relative group">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
            <Search size={20} />
          </div>
          <input
            type="text"
            placeholder={t('search_student')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-14 pr-6 py-4 bg-white border-2 border-slate-100 rounded-2xl text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/5 transition-all shadow-sm"
          />
        </div>
        <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{isRTL ? 'إجمالي الطلاب' : 'Total Students'}</span>
          <span className="text-xl font-black text-primary">{filteredStudents.length}</span>
        </div>
      </div>

      {/* Students List */}
      <div className="bg-white rounded-2xl sm:rounded-[2.5rem] border-2 border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full border-collapse min-w-[650px]">
            <thead>
              <tr className="bg-slate-50/50 border-b-2 border-slate-100">
                <th className={cn("px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400", isRTL ? "text-right" : "text-left")}>
                  {t('student_name')}
                </th>
                <th className={cn("px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400", isRTL ? "text-right" : "text-left")}>
                  {t('classes')}
                </th>
                <th className={cn("px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400", isRTL ? "text-right" : "text-left")}>
                  {t('parent_phone')}
                </th>
                <th className={cn("px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400", isRTL ? "text-right" : "text-left")}>
                  {t('sessions')} (4/m)
                </th>
                <th className={cn("px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400", isRTL ? "text-left" : "text-right")}>
                  {isRTL ? 'العمليات' : 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-30">
                      <Search size={48} className="text-slate-300" />
                      <p className="text-sm font-bold text-slate-400 tracking-wide uppercase">
                        {isRTL ? 'لم يتم العثور على نتائج' : 'No students matching your search'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const sessionsDone = getSessionCount(student.id);
                  return (
                    <motion.tr 
                      key={student.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                            <User size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900 group-hover:text-primary transition-colors">{student.name}</p>
                            {student.tokenId && (
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-1">
                                <Shield size={10} />
                                {student.tokenId}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                         <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase bg-slate-100 text-slate-600 border border-slate-200">
                           {getClassBadge(student.classId)}
                         </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                          <Phone size={14} className="text-slate-300" />
                          {student.parentPhone}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-1.5">
                          {[1, 2, 3, 4].map((i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => handleToggleSessionTrigger(student, i)}
                              className="focus:outline-none hover:scale-110 transition-transform p-0.5 rounded-full"
                              title={isRTL ? `تبديل الجلسة ${i}` : `Toggle session ${i}`}
                            >
                              {i <= sessionsDone ? (
                                <CheckCircle2 size={18} className="text-emerald-500 fill-emerald-50" />
                              ) : (
                                <Circle size={18} className="text-slate-200 hover:text-slate-400" />
                              )}
                            </button>
                          ))}
                          <span className="ml-2 text-[10px] font-black text-slate-400">
                            {sessionsDone}/4
                          </span>
                        </div>
                      </td>
                      <td className={cn("px-8 py-6", isRTL ? "text-left" : "text-right")}>
                        <div className={cn("flex items-center gap-3 justify-end", isRTL && "justify-start")}>
                          <button
                             onClick={() => handleViewLogs(student)}
                             className="p-2 text-slate-300 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                             title={isRTL ? 'سجل الحضور' : 'Attendance Logs'}
                          >
                             <FileText size={18} />
                          </button>
                          {activeRole === 'director' && (
                            <>
                              <button 
                                onClick={() => {
                                  setSelectedStudent(student);
                                  setIsEditModalOpen(true);
                                }}
                                className="p-2 text-slate-300 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                                title={isRTL ? 'تعديل' : 'Edit'}
                              >
                                <Pencil size={18} />
                              </button>
                              <button 
                                onClick={() => handleDeleteStudent(student.id)}
                                className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                title={isRTL ? 'حذف' : 'Delete'}
                              >
                                <Trash2 size={18} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Student Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={t('add_student')}
      >
        <form onSubmit={handleCreateStudent} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">{t('student_name')}</label>
              <input
                required
                value={newStudent.name}
                onChange={(e) => setNewStudent({...newStudent, name: e.target.value})}
                className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-primary/20 focus:bg-white transition-all"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">{t('parent_phone')}</label>
                <input
                  required
                  value={newStudent.parentPhone}
                  onChange={(e) => setNewStudent({...newStudent, parentPhone: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-primary/20 focus:bg-white transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">{isRTL ? 'رمز البطاقة' : 'Token ID'}</label>
                <input
                  value={newStudent.tokenId}
                  onChange={(e) => setNewStudent({...newStudent, tokenId: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-primary/20 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">{t('classes')}</label>
              <select
                required
                value={newStudent.classId}
                onChange={(e) => setNewStudent({...newStudent, classId: e.target.value})}
                className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-primary/20 focus:bg-white transition-all appearance-none"
              >
                <option value="">{isRTL ? 'اختر القسم' : 'Select Class'}</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-primary/90 transition-all hover:shadow-xl hover:shadow-primary/20 active:scale-95 mt-4"
          >
            {isRTL ? 'إضافة الطالب الآن' : 'Add Student Now'}
          </button>
        </form>
      </Modal>

      {/* Edit Student Modal */}
      <Modal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        title={isRTL ? 'تعديل بيانات الطالب' : 'Edit Student Details'}
      >
        {selectedStudent && (
          <form onSubmit={handleUpdateStudent} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">{t('student_name')}</label>
                <input
                  required
                  value={selectedStudent.name}
                  onChange={(e) => setSelectedStudent({...selectedStudent, name: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-primary/20 focus:bg-white transition-all"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">{t('parent_phone')}</label>
                  <input
                    required
                    value={selectedStudent.parentPhone}
                    onChange={(e) => setSelectedStudent({...selectedStudent, parentPhone: e.target.value})}
                    className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-primary/20 focus:bg-white transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">{isRTL ? 'رمز البطاقة' : 'Token ID'}</label>
                  <input
                    value={selectedStudent.tokenId || ''}
                    onChange={(e) => setSelectedStudent({...selectedStudent, tokenId: e.target.value})}
                    className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-primary/20 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">{t('classes')}</label>
                <select
                  required
                  value={selectedStudent.classId}
                  onChange={(e) => setSelectedStudent({...selectedStudent, classId: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-primary/20 focus:bg-white transition-all appearance-none"
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 mt-4"
            >
              {isRTL ? 'حفظ التغييرات' : 'Save Changes'}
            </button>
          </form>
        )}
      </Modal>

      {/* Student Attendance Logs Modal */}
      <Modal
        isOpen={isLogsModalOpen}
        onClose={() => setIsLogsModalOpen(false)}
        title={isRTL ? `سجل حضور: ${selectedStudent?.name}` : `Attendance Log: ${selectedStudent?.name}`}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-3">
              <Clock className="text-primary" size={20} />
              <span className="text-sm font-bold text-slate-600">
                {isRTL ? "سجل الشهر الحالي" : "Current Month Log"}
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
                  {isRTL ? "جاري التحميل..." : "Loading logs..."}
                </p>
              </div>
            ) : studentLogs.length === 0 ? (
              <div className="py-20 text-center space-y-4 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto text-slate-200 border border-slate-100">
                  <FileText size={24} />
                </div>
                <p className="text-sm font-bold text-slate-400">
                  {isRTL ? "لا يوجد سجلات لهذا الشهر" : "No pointage records found for this student"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {studentLogs.map((log) => (
                  <div key={log.id} className="group flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                        <Calendar size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-primary">
                          {new Date(log.timestamp).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', { 
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
                         {log.details || "Clock-In"}
                       </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Total: {studentLogs.length} {isRTL ? "حضورا" : "sessions"}
            </div>
            <button 
              onClick={() => setIsLogsModalOpen(false)}
              className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95"
            >
              {isRTL ? "إغلاق" : "Close"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
