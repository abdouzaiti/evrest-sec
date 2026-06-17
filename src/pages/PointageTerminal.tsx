import React, { useState, useEffect, useRef } from 'react';
import { 
  Scan, 
  User, 
  GraduationCap, 
  HelpCircle, 
  FileSpreadsheet, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Trash2, 
  Volume2, 
  VolumeX, 
  Keyboard, 
  UserCheck, 
  Link2,
  Calendar
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { studentsService, teachersService, pointageService, classesService } from '../services/supabaseService';
import { Student, Teacher, PointageLog, SchoolClass } from '../types';

export default function PointageTerminal() {
  const { t, isRTL, language } = useLanguage();
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [logs, setLogs] = useState<PointageLog[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [manualScanInput, setManualScanInput] = useState('');
  const [recentScanResult, setRecentScanResult] = useState<{
    success: boolean;
    type: 'student' | 'teacher';
    name: string;
    details: string;
    tokenId: string;
    isPaid?: boolean;
  } | null>(null);

  // Sound effects configurations
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [rfidFocus, setRfidFocus] = useState(false);
  
  // Ref for RFID keyboard reader emulator input focus
  const rfidInputRef = useRef<HTMLInputElement>(null);

  // States for Assigning Token Quick Modal
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignTargetType, setAssignTargetType] = useState<'student' | 'teacher'>('student');
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [newTokenCode, setNewTokenCode] = useState('');

  useEffect(() => {
    loadData();
    // Auto-focus RFID reader on load
    setTimeout(() => {
      rfidInputRef.current?.focus();
    }, 600);

    // Global Key Listener to redirect hardware scans (keyboard emulation)
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if an interactive modal input, select or textarea is currently focused
      const activeEl = document.activeElement;
      if (activeEl) {
        const tagName = activeEl.tagName.toLowerCase();
        if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
          if (activeEl !== rfidInputRef.current) {
            return;
          }
        }
      }

      // Ignore common modifier keys
      if (e.ctrlKey || e.altKey || e.metaKey || e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt') {
        return;
      }

      // If user presses any alphanumeric key, focus our scan field automatically
      if (rfidInputRef.current && document.activeElement !== rfidInputRef.current) {
        rfidInputRef.current.focus();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sList, tList, cList, lList] = await Promise.all([
        studentsService.getAll(),
        teachersService.getAll(),
        pointageService.getAll(),
        classesService.getAll()
      ]);
      setStudents(sList);
      setTeachers(tList);
      setClasses(cList);
      setLogs(lList);
    } catch (err) {
      console.error("Error loading data in terminal:", err);
    } finally {
      setLoading(false);
    }
  };

  // Play synthesized audio for physically engaging feedback
  const playBeep = (type: 'success' | 'failure' | 'neutral') => {
    if (!soundEnabled) return;
    try {
      // Modern Web Audio API synth
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (type === 'success') {
        // High-pitched pleasant bell sound
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
        
        gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
        
        osc1.start();
        osc2.start();
        osc1.stop(audioCtx.currentTime + 0.35);
        osc2.stop(audioCtx.currentTime + 0.35);
      } else if (type === 'failure') {
        // Low buzzy warning tone
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140.0, audioCtx.currentTime); // Low frequency
        
        gainNode.gain.setValueAtTime(0.18, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.45);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.45);
      } else {
        // Standard scan beep
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      }
    } catch (e) {
      console.warn("Sound synth failed to play", e);
    }
  };

  const handleScanToken = async (tokenIdToScan: string) => {
    const rawVal = tokenIdToScan.trim();
    if (!rawVal) return;

    // Search students
    const matchedStudent = students.find(s => s.tokenId?.toUpperCase() === rawVal.toUpperCase());
    
    // Search teachers
    const matchedTeacher = teachers.find(t => t.tokenId?.toUpperCase() === rawVal.toUpperCase());

    if (matchedStudent) {
      const isPaid = matchedStudent.paymentStatus === 'Paid';
      const studentClassName = classes.find(c => c.id === matchedStudent.classId)?.name || '';
      
      const detailsMsg = isPaid 
        ? `${t('student_scan_outcome_paid')} (${studentClassName})`
        : `${t('student_scan_outcome_unpaid')} (${studentClassName})`;
        
      playBeep(isPaid ? 'success' : 'failure');
      
      setRecentScanResult({
        success: isPaid,
        type: 'student',
        name: matchedStudent.name,
        details: detailsMsg,
        tokenId: rawVal,
        isPaid
      });

      // Write code Pointage Log in Supabase
      try {
        const logged = await pointageService.log({
          personId: matchedStudent.id,
          personType: 'student',
          personName: matchedStudent.name,
          tokenId: rawVal,
          details: isPaid ? 'Status: Paid' : 'Status: NOT PAID / BLOCKED'
        });
        setLogs(prev => [logged, ...prev]);
      } catch (err) {
        console.error(err);
      }

    } else if (matchedTeacher) {
      const detailsMsg = `${t('teacher_scan_outcome')} - ${matchedTeacher.subject}`;
      
      playBeep('success');
      
      setRecentScanResult({
        success: true,
        type: 'teacher',
        name: matchedTeacher.name,
        details: detailsMsg,
        tokenId: rawVal,
        isPaid: true
      });

      // Log teacher Pointage in database
      try {
        const logged = await pointageService.log({
          personId: matchedTeacher.id,
          personType: 'teacher',
          personName: matchedTeacher.name,
          tokenId: rawVal,
          details: `Pointage: Presence recorded`
        });
        setLogs(prev => [logged, ...prev]);
        
        // Also fire off status update for teacher check-in alert if needed
      } catch (err) {
        console.error(err);
      }

    } else {
      // Not found
      playBeep('failure');
      setRecentScanResult({
        success: false,
        type: 'student',
        name: rawVal,
        details: language === 'ar' 
          ? 'المسح فشل: الرمز غير معرّف في النظام! يرجى ربطه أولاً.' 
          : language === 'fr' 
            ? 'Scan échoué : Jeton non reconnu dans le système !' 
            : 'Scan failed: Token not recognized. Please register it.',
        tokenId: rawVal,
        isPaid: false
      });
    }

    setManualScanInput('');
    // Auto re-focus
    setTimeout(() => {
      rfidInputRef.current?.focus();
    }, 100);
  };

  const handleManualFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleScanToken(manualScanInput);
  };

  const clearAllLogs = async () => {
    if (confirm(language === 'ar' ? 'هل أنت متأكد من مسح جميع السجلات؟' : 'Effacer l\'historique définitif ?')) {
      await pointageService.clearAll();
      setLogs([]);
    }
  };

  const handleAssignTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPersonId || !newTokenCode.trim()) return;

    try {
      setLoading(true);
      const code = newTokenCode.trim();
      
      if (assignTargetType === 'student') {
        const currentStudent = students.find(s => s.id === selectedPersonId);
        if (currentStudent) {
          const updated = await studentsService.update(selectedPersonId, {
            ...currentStudent,
            tokenId: code
          });
          setStudents(prev => prev.map(s => s.id === selectedPersonId ? { ...s, tokenId: code } : s));
        }
      } else {
        const currentTeacher = teachers.find(t => t.id === selectedPersonId);
        if (currentTeacher) {
          const updated = await teachersService.update(selectedPersonId, {
            ...currentTeacher,
            tokenId: code
          });
          setTeachers(prev => prev.map(t => t.id === selectedPersonId ? { ...t, tokenId: code } : t));
        }
      }

      setIsAssigning(false);
      setNewTokenCode('');
      setSelectedPersonId('');
      
      // Notify
      alert(language === 'ar' ? 'تم ربط البطاقة بنجاح!' : 'Jeton associé avec succès !');
      
      // Focus RFID
      setTimeout(() => rfidInputRef.current?.focus(), 200);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6" id="pointage_terminal_page">
      {/* Title Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900" id="terminal_header_title">
            {t('pointage_terminal')}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {language === 'ar' 
              ? 'تسيير دخول وخروج التلاميذ بنقرة واحدة بمراقبة الاشتراكات، وتسجيل نقطة حضور الأساتذة.' 
              : 'Gérez l\'accès physique en vérifiant instantanément l\'état des paiements et effectuez le pointage automatique.'}
          </p>
        </div>

        {/* Audio control + RFID stats banner */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <button 
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-lg border transition-all flex items-center gap-2 text-sm font-medium ${
              soundEnabled 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' 
                : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
            }`}
            title="Toggle Speaker beep sound"
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>{soundEnabled ? (language === 'ar' ? 'صوت مفعل' : 'Son activé') : (language === 'ar' ? 'صوت ملتغي' : 'Son coupé')}</span>
          </button>

          <button
            onClick={() => {
              setIsAssigning(true);
              setNewTokenCode('');
            }}
            className="bg-primary text-white hover:bg-primary/95 text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm flex items-center gap-2 transition-colors"
          >
            <Link2 size={16} />
            {t('assign_token')}
          </button>
        </div>
      </div>

      {/* Main Terminal Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Interaction Terminal UI */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Active Reader Target / Scanner Core Graphic */}
          <div 
            onClick={() => rfidInputRef.current?.focus()}
            className={`p-8 rounded-2xl border-2 text-center transition-all cursor-pointer relative overflow-hidden bg-white ${
              rfidFocus 
                ? 'border-primary ring-4 ring-primary/5 shadow-lg' 
                : 'border-slate-150 shadow-sm hover:border-slate-300'
            }`}
          >
            {/* Soft pulsing scanning beam */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" />

            <div className="mx-auto w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-primary mb-4 transition-transform hover:scale-110">
              <Scan size={32} className={rfidFocus ? "animate-pulse" : ""} />
            </div>

            <h3 className="text-lg font-bold text-slate-800">
              {rfidFocus ? (language === 'ar' ? 'القارئ متصل وجاهز للمسح' : 'Lecteur RFID connecté & prêt') : t('scan_instruction')}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {language === 'ar'
                ? 'الرجاء توجيه المؤشر هنا أو استخدام قارئ الباركود/RFID. يقوم بمحاكاة الإدخال عند الضغط على زر الإرسال.'
                : 'Veuillez cliquer dans cette zone et badger, ou tapez manuellement le code du jeton ci-dessous.'}
            </p>

            {/* Hidden Input field for RFID scanners (keyboard emulators) */}
            <form onSubmit={handleManualFormSubmit} className="mt-6 max-w-xs mx-auto">
              <div className="relative">
                <input
                  ref={rfidInputRef}
                  type="text"
                  placeholder="Ex: S101, T201..."
                  value={manualScanInput}
                  onChange={(e) => setManualScanInput(e.target.value)}
                  onFocus={() => setRfidFocus(true)}
                  onBlur={() => setRfidFocus(false)}
                  className="w-full text-center font-mono uppercase font-bold text-sm tracking-widest bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white text-slate-800"
                />
                
                <button
                  type="submit"
                  className="mt-2.5 w-full bg-slate-800 text-white hover:bg-slate-900 font-semibold py-2 rounded-lg text-xs transition-colors tracking-wide flex items-center justify-center gap-1.5"
                >
                  <Keyboard size={14} />
                  {language === 'ar' ? 'إرسال ومحاكاة البطاقة' : 'Valider & Simuler'}
                </button>
              </div>
            </form>

            <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <span className={`w-2.5 h-2.5 rounded-full ${rfidFocus ? 'bg-emerald-500 animate-ping' : 'bg-amber-400'}`} />
              <span>{rfidFocus ? (language === 'ar' ? 'حالة الاستيعاب: نشط' : 'Statut: Prêt à badger') : (language === 'ar' ? 'اضغط للتركيز وتوصيل القارئ' : 'Cliquez ici pour focaliser le terminal')}</span>
            </div>
          </div>


          {/* SCAN DETAILED SCREEN / OUTCOME CARD */}
          {recentScanResult ? (
            <div className={`p-6 rounded-2xl border transition-all duration-300 ${
              recentScanResult.success 
                ? 'bg-emerald-50/50 border-emerald-150' 
                : 'bg-rose-50/50 border-rose-150'
            }`}>
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-full ${
                  recentScanResult.success ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                }`}>
                  {recentScanResult.success ? <CheckCircle size={24} /> : <XCircle size={24} />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                      {recentScanResult.type === 'student' ? (language === 'ar' ? 'بطاقة تلميذ' : 'Jeton Élève') : (language === 'ar' ? 'بطاقة أستاذ' : 'Jeton Enseignant')}
                    </span>
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border">
                      ID: {recentScanResult.tokenId}
                    </span>
                  </div>

                  <h4 className="text-xl font-bold text-slate-800 mt-1 truncate">
                    {recentScanResult.name}
                  </h4>

                  <p className={`text-sm mt-1.5 font-medium leading-relaxed ${
                    recentScanResult.success ? 'text-emerald-700' : 'text-rose-700'
                  }`}>
                    {recentScanResult.details}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Calendar size={13} />
                      <span>{new Date().toLocaleTimeString()}</span>
                    </div>

                    {recentScanResult.type === 'student' && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        recentScanResult.isPaid 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {recentScanResult.isPaid ? t('paid') : t('unpaid')}
                      </span>
                    )}

                    {recentScanResult.type === 'teacher' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                        {language === 'ar' ? 'تم تسجيل حضور' : 'Pointage OK'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-2xl border border-dashed border-slate-200 text-center bg-slate-50/50">
              <p className="text-slate-400 text-sm">
                {language === 'ar' 
                  ? 'لم يتم مسح أي بطاقة حتى الآن. مرر بطاقة RFID للتجربة.' 
                  : 'Aucun scan en cours. Présentez un jeton pour afficher ses données.'}
              </p>
            </div>
          )}


          {/* QUICK SIMULATOR DECK: Click to scan codes */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
              <GraduationCap size={16} className="text-primary" />
              {language === 'ar' ? 'مفاتيح المحاكاة السريعة (اضغط للتجريب)' : 'Raccourcis de simulation de badges'}
            </h4>

            {/* Students short simulation list */}
            <div className="space-y-4">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase block mb-2">
                  {language === 'ar' ? 'تلاميذ في النظام (مستحقات مدفوعة وغير مدفوعة)' : 'Élèves avec Jetons'}
                </span>
                <div className="flex flex-wrap gap-2">
                  {students.filter(s => s.tokenId).map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleScanToken(s.tokenId || '')}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all text-left ${
                        s.paymentStatus === 'Paid'
                          ? 'bg-emerald-50 border-emerald-150 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-rose-50 border-rose-150 text-rose-700 hover:bg-rose-100'
                      }`}
                    >
                      <User size={12} />
                      <span className="max-w-[120px] truncate">{s.name}</span>
                      <span className="font-mono text-[9px] px-1 bg-white/60 border rounded">{s.tokenId}</span>
                    </button>
                  ))}
                  {students.filter(s => s.tokenId).length === 0 && (
                    <span className="text-xs text-slate-400 italic">No student token registers</span>
                  )}
                </div>
              </div>

              {/* Teachers simulation register */}
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase block mb-2">
                  {language === 'ar' ? 'أساتذة في النظام (لتسجيل الحضور المباشر)' : 'Enseignants avec Jetons (Pointage)'}
                </span>
                <div className="flex flex-wrap gap-2">
                  {teachers.filter(t => t.tokenId).map(teacher => (
                    <button
                      key={teacher.id}
                      type="button"
                      onClick={() => handleScanToken(teacher.tokenId || '')}
                      className="px-3 py-1.5 rounded-lg border border-indigo-150 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      <UserCheck size={12} />
                      <span className="max-w-[120px] truncate">{teacher.name}</span>
                      <span className="font-mono text-[9px] px-1 bg-white/60 border rounded">{teacher.tokenId}</span>
                    </button>
                  ))}
                  {teachers.filter(t => t.tokenId).length === 0 && (
                    <span className="text-xs text-slate-400 italic">No teacher token registers</span>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>


        {/* RIGHT COLUMN: Logs & Activity */}
        <div className="lg:col-span-5 space-y-6">

          {/* Activity Logs List */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={16} className="text-primary" />
                <h3 className="text-sm font-bold text-slate-700">{t('pointage_logs')}</h3>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={loadData}
                  className="p-1.5 text-slate-500 hover:text-primary transition-colors rounded hover:bg-slate-100"
                  title="Reload Logs List"
                >
                  <RefreshCw size={14} />
                </button>
                
                <button
                  onClick={clearAllLogs}
                  className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors rounded hover:bg-rose-50"
                  title={t('clear_logs')}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Scrollable list content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[520px]">
              {logs.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  {language === 'ar' ? 'لا توجد سجلات بعد.' : 'Aucun pointage enregistré aujourd\'hui.'}
                </div>
              ) : (
                logs.map((log) => {
                  const detailsText = log.details || '';
                  const isPaid = detailsText.toLowerCase().includes('paid');
                  const isBlocked = detailsText.toLowerCase().includes('not paid') || detailsText.toLowerCase().includes('blocked');
                  
                  let badgeColor = "bg-slate-100 text-slate-700 border-slate-200";
                  if (log.personType === 'student') {
                    badgeColor = isPaid 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-150" 
                      : (isBlocked ? "bg-rose-50 text-rose-700 border-rose-150" : "bg-amber-50 text-amber-700 border-amber-150");
                  } else {
                    badgeColor = "bg-indigo-50 text-indigo-700 border-indigo-150";
                  }

                  return (
                    <div 
                      key={log.id}
                      className={`p-3 rounded-xl border text-xs transition-colors flex items-start gap-2.5 ${badgeColor}`}
                    >
                      <div className="mt-0.5">
                        {log.personType === 'student' ? (
                          <GraduationCap size={14} className="opacity-80" />
                        ) : (
                          <UserCheck size={14} className="opacity-80" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="font-bold truncate">{log.personName}</span>
                          <span className="text-[9px] opacity-70 font-mono">{log.tokenId}</span>
                        </div>

                        <p className="mt-1 font-medium text-[11px] opacity-90 leading-tight">
                          {language === 'ar' && log.personType === 'student' && isPaid ? 'اشتراك مدفوع - تم الدخول' : ''}
                          {language === 'ar' && log.personType === 'student' && isBlocked ? 'اشتراك غير مدفوع - تجميد الدخول' : ''}
                          {language === 'ar' && log.personType === 'teacher' ? 'تسجيل حضور الأستاذ' : ''}
                          {(!isRTL || (log.details && !log.details.includes('Status'))) ? log.details : ''}
                        </p>

                        <div className="mt-1.5 flex items-center justify-between text-[9px] opacity-60">
                          <span>{log.personType === 'student' ? (language === 'ar' ? 'تلميذ' : 'Élève') : (language === 'ar' ? 'أستاذ' : 'Enseignant')}</span>
                          <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 text-center text-[10px] text-slate-400">
              {language === 'ar' 
                ? 'الحسابات وسجلات الأساتذة والطلاب مرتبطة ومحفوظة تلقائياً.' 
                : 'Les registres des élèves et des enseignants sont synchronisés localement ou sur Supabase.'}
            </div>
          </div>

        </div>

      </div>


      {/* TOKEN QUICK ASSOCIATION FLOW MODAL */}
      {isAssigning && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border overflow-hidden p-6 relative">
            <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
              <Link2 size={20} className="text-primary" />
              {t('assign_token')}
            </h3>
            
            <p className="text-xs text-slate-500 mb-4">
              {language === 'ar' 
                ? 'اربط بطاقة RFID أو رمز الباركود بحساب تلميذ أو أستاذ للعمل به في البوابة.'
                : 'Associez un jeton physique à un profil pour qu\'il soit opérationnel immédiatement.'}
            </p>

            <form onSubmit={handleAssignTokenSubmit} className="space-y-4">
              
              {/* Type Switcher */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">
                  {language === 'ar' ? 'نوع الحساب' : 'Type de profil'}
                </label>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setAssignTargetType('student');
                      setSelectedPersonId('');
                    }}
                    className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                      assignTargetType === 'student'
                        ? 'bg-primary text-white border-primary shadow-sm shadow-primary/10'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {language === 'ar' ? 'تلميذ' : 'Élève'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAssignTargetType('teacher');
                      setSelectedPersonId('');
                    }}
                    className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                      assignTargetType === 'teacher'
                        ? 'bg-primary text-white border-primary shadow-sm shadow-primary/10'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {language === 'ar' ? 'أستاذ' : 'Enseignant'}
                  </button>
                </div>
              </div>

              {/* Selection Person */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">
                  {assignTargetType === 'student' ? (language === 'ar' ? 'اختر التلميذ' : 'Sélectionner l\'élève') : (language === 'ar' ? 'اختر الأستاذ' : 'Sélectionner l\'enseignant')}
                </label>
                <select
                  required
                  value={selectedPersonId}
                  onChange={(e) => {
                    setSelectedPersonId(e.target.value);
                    // Autofills existing if any
                    const item = assignTargetType === 'student' 
                      ? students.find(s => s.id === e.target.value)
                      : teachers.find(t => t.id === e.target.value);
                    if (item && item.tokenId) {
                      setNewTokenCode(item.tokenId);
                    } else {
                      setNewTokenCode('');
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white text-slate-700"
                >
                  <option value="">-- {language === 'ar' ? 'اختر من القائمة' : 'Sélectionner'} --</option>
                  
                  {assignTargetType === 'student' ? (
                    students.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.tokenId ? `(Possède déjà: ${s.tokenId})` : `(${language === 'ar' ? 'لا يملك بطاقة' : 'Sans jeton'})`}
                      </option>
                    ))
                  ) : (
                    teachers.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} {t.tokenId ? `(Possède déjà: ${t.tokenId})` : `(${language === 'ar' ? 'لا يملك بطاقة' : 'Sans jeton'})`}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Input Code */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">
                  {t('token_id')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Ex: S101, T201, 892305A"
                    value={newTokenCode}
                    onChange={(e) => setNewTokenCode(e.target.value)}
                    className="w-full font-mono uppercase bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white text-slate-800 placeholder-slate-400 font-semibold"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  {language === 'ar' 
                    ? 'يمكنك تمرير البطاقة الآن على القارئ لكتابة الرمز تلقائيًا.' 
                    : 'Astuce : Vous pouvez badger pour remplir ce champ automatiquement.'}
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2.5 mt-6 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAssigning(false);
                    setTimeout(() => rfidInputRef.current?.focus(), 150);
                  }}
                  className="w-1/2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold py-2.5 rounded-lg text-xs transition-colors"
                >
                  {language === 'ar' ? 'إلغاء' : 'Annuler'}
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-primary text-white hover:bg-primary/95 font-semibold py-2.5 rounded-lg text-xs transition-colors shadow-sm"
                >
                  {language === 'ar' ? 'حفظ وتثبيت' : 'Associer & Enregistrer'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
