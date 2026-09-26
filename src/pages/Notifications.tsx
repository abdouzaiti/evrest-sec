import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  AlertTriangle, 
  CheckCircle2, 
  Phone, 
  MessageCircle, 
  CreditCard, 
  Check, 
  Loader2, 
  Search, 
  Filter, 
  ArrowRight, 
  GraduationCap, 
  Clock,
  Sparkles,
  AlertOctagon,
  RefreshCw
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import { studentsService, classesService, paymentsService } from '../services/supabaseService';
import { Student, SchoolClass } from '../types';

export interface AttendanceNotification {
  id: string;
  studentId: string;
  studentName: string;
  parentPhone: string;
  secondaryPhone?: string;
  tokenId?: string;
  classId: string;
  className: string;
  classPrice: number;
  month: number;
  completedSessions: number;
  presentCount: number;
  absentCount: number;
  sessions: (boolean | string)[];
  urgency: 'critical' | 'warning'; // critical for 4/4 sessions, warning for 3/4 sessions
  timestamp: string;
  isRead?: boolean;
}

export function Notifications() {
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();

  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'critical' | 'warning'>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('everest_read_notifications');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const loadData = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      else setRefreshing(true);

      const [studentsData, classesData] = await Promise.all([
        studentsService.getAll(),
        classesService.getAll()
      ]);
      setStudents(studentsData);
      setClasses(classesData);
    } catch (err) {
      console.error('Error loading notifications data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData(true);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Compute all unpaid notifications with >= 3 completed sessions (present or absent)
  const classesMap = new Map(classes.map(c => [c.id, c]));

  const notifications: AttendanceNotification[] = [];

  students.forEach(student => {
    const studentClassIds = Array.isArray(student.classIds) && student.classIds.length > 0
      ? student.classIds
      : (student.classId ? [student.classId] : []);

    const attData: any = student.attendance || {};
    const paidMonths = Array.isArray(student.paidMonths) ? student.paidMonths : [];

    studentClassIds.forEach(cid => {
      const targetClass = classesMap.get(cid) || classes.find(c => c.name === cid);
      const classKey = targetClass ? targetClass.id : cid;
      const classAtt = attData[classKey] || attData[cid] || {};

      // Check all 12 months or active months
      for (let month = 1; month <= 12; month++) {
        const rawSessions = classAtt[month] || classAtt[String(month)] || [];
        if (Array.isArray(rawSessions) && rawSessions.length > 0) {
          const completedCount = rawSessions.filter(
            s => s === true || s === 'present' || s === 'absent'
          ).length;

          const presentCount = rawSessions.filter(
            s => s === true || s === 'present'
          ).length;

          const absentCount = rawSessions.filter(
            s => s === 'absent'
          ).length;

          const isPaid = paidMonths.includes(month);

          // Notification triggers from Session 3 upwards until the student pays for that month
          if (completedCount >= 3 && !isPaid) {
            const notifId = `${student.id}_${classKey}_m${month}`;
            notifications.push({
              id: notifId,
              studentId: student.id,
              studentName: student.name,
              parentPhone: student.parentPhone || '',
              secondaryPhone: student.secondaryPhone,
              tokenId: student.tokenId,
              classId: classKey,
              className: targetClass ? targetClass.name : 'Classe',
              classPrice: targetClass ? targetClass.price : 0,
              month,
              completedSessions: completedCount,
              presentCount,
              absentCount,
              sessions: rawSessions,
              urgency: completedCount >= 4 ? 'critical' : 'warning',
              timestamp: new Date().toISOString(),
              isRead: readIds.has(notifId)
            });
          }
        }
      }
    });
  });

  // Sort: Critical (4/4) first, then Warning (3/4), then by student name
  notifications.sort((a, b) => {
    if (a.urgency !== b.urgency) {
      return a.urgency === 'critical' ? -1 : 1;
    }
    return a.studentName.localeCompare(b.studentName);
  });

  const handleMarkAsPaid = async (notif: AttendanceNotification) => {
    try {
      setProcessingId(notif.id);
      const student = students.find(s => s.id === notif.studentId);
      if (!student) return;

      const currentPaidMonths = Array.isArray(student.paidMonths) ? student.paidMonths : [];
      const updatedPaidMonths = currentPaidMonths.includes(notif.month)
        ? currentPaidMonths
        : [...currentPaidMonths, notif.month];

      // Update student on Supabase
      const updatedStudent: Student = {
        ...student,
        paidMonths: updatedPaidMonths,
        paymentStatus: 'Paid'
      };

      await studentsService.update(student.id, updatedStudent);

      // Record payment transaction
      if (notif.classPrice > 0) {
        try {
          await paymentsService.create({
            studentId: student.id,
            studentName: student.name,
            classId: notif.classId,
            month: notif.month,
            amountPaid: notif.classPrice,
            sarf: notif.classPrice * 0.5,
            sessionDates: [],
            timestamp: new Date().toISOString()
          });
        } catch (e) {
          console.warn('Payment ledger notice:', e);
        }
      }

      setStudents(prev => prev.map(s => s.id === student.id ? updatedStudent : s));
      setSuccessToast(`Paiement du Mois ${notif.month} pour ${notif.studentName} enregistré avec succès !`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      console.error('Error recording payment:', err);
      alert('Erreur lors de l\'enregistrement du paiement : ' + (err?.message || 'Erreur réseau'));
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkAllRead = () => {
    const newSet = new Set(notifications.map(n => n.id));
    setReadIds(newSet);
    localStorage.setItem('everest_read_notifications', JSON.stringify(Array.from(newSet)));
  };

  const filteredNotifications = notifications.filter(n => {
    const matchFilter = 
      filterType === 'all' ? true :
      filterType === 'critical' ? n.urgency === 'critical' :
      n.urgency === 'warning';

    const q = search.toLowerCase().trim();
    const matchSearch = !q ||
      n.studentName.toLowerCase().includes(q) ||
      n.parentPhone.includes(q) ||
      (n.secondaryPhone && n.secondaryPhone.includes(q)) ||
      n.className.toLowerCase().includes(q) ||
      (n.tokenId && n.tokenId.toLowerCase().includes(q));

    return matchFilter && matchSearch;
  });

  const criticalCount = notifications.filter(n => n.urgency === 'critical').length;
  const warningCount = notifications.filter(n => n.urgency === 'warning').length;
  const totalDueAmount = notifications.reduce((acc, n) => acc + (n.classPrice || 0), 0);

  if (loading) {
    return (
      <div className="h-[65vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-slate-400 font-black uppercase tracking-widest text-xs">
          {isRTL ? "Vérification des séances & paiements..." : "Loading notifications..."}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("max-w-5xl mx-auto space-y-8 animate-in", isRTL && "text-right")}>
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 p-4 bg-emerald-600 text-white rounded-2xl shadow-xl flex items-center gap-3 animate-fade-in text-sm font-bold">
          <CheckCircle2 size={20} className="shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header */}
      <header className={cn("flex flex-col md:flex-row justify-between items-start md:items-end gap-4", isRTL && "md:flex-row-reverse")}>
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-700 rounded-xl text-xs font-black uppercase tracking-wider mb-2">
            <Bell size={14} className="animate-pulse text-amber-600" />
            <span>{isRTL ? "Suivi Assiduité & Recouvrement" : "Session & Payment Tracker"}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-primary tracking-tight">
            {isRTL ? "Alertes de Renouvellement" : "Payment & Session Alerts"}
          </h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">
            {isRTL 
              ? "Élèves ayant atteint 3 ou 4 séances (présent/absent) en attente de paiement"
              : "Students with 3 or 4 completed sessions (present/absent) awaiting month renewal"}
          </p>
        </div>

        <div className={cn("flex items-center gap-2.5", isRTL && "flex-row-reverse")}>
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            title="Actualiser les données"
          >
            <RefreshCw size={16} className={cn(refreshing && "animate-spin")} />
            <span className="hidden sm:inline">Actualiser</span>
          </button>
          <button 
            onClick={handleMarkAllRead}
            disabled={notifications.length === 0}
            className="px-4 py-3 bg-white border border-slate-200 hover:border-slate-300 text-primary font-black text-xs rounded-2xl transition-all shadow-xs active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {isRTL ? "Tout marquer comme vu" : "Mark all as read"}
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total to recover */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total en attente</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-white/10 text-amber-300">
                {notifications.length} élève(s)
              </span>
            </div>
            <h3 className="text-2xl md:text-3xl font-black text-amber-400 tracking-tight">
              {totalDueAmount.toLocaleString()} {t('currency')}
            </h3>
            <p className="text-xs text-slate-400 mt-1 font-medium">Revenus à recouvrer</p>
          </div>
        </div>

        {/* 4/4 Sessions - Terminé / Paiement Requis */}
        <div className="bg-rose-50 border-2 border-rose-100/80 p-6 rounded-3xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-rose-600/70">4/4 Séances faites</span>
            <span className="p-2 bg-rose-500 text-white rounded-xl">
              <AlertOctagon size={16} />
            </span>
          </div>
          <h3 className="text-2xl md:text-3xl font-black text-rose-700 tracking-tight">
            {criticalCount}
          </h3>
          <p className="text-xs text-rose-600/80 mt-1 font-bold">Mois complété • Paiement immédiat</p>
        </div>

        {/* 3/4 Sessions - Renouvellement Imminent */}
        <div className="bg-amber-50 border-2 border-amber-100/80 p-6 rounded-3xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600/70">3/4 Séances faites</span>
            <span className="p-2 bg-amber-500 text-white rounded-xl">
              <Clock size={16} />
            </span>
          </div>
          <h3 className="text-2xl md:text-3xl font-black text-amber-700 tracking-tight">
            {warningCount}
          </h3>
          <p className="text-xs text-amber-600/80 mt-1 font-bold">1 séance restante • Rappel anticipé</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className={cn("flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-xs", isRTL && "md:flex-row-reverse")}>
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setFilterType('all')}
            className={cn(
              "px-4 py-2.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap",
              filterType === 'all'
                ? "bg-primary text-white shadow-md shadow-primary/20"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            Tous ({notifications.length})
          </button>
          <button
            onClick={() => setFilterType('critical')}
            className={cn(
              "px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap",
              filterType === 'critical'
                ? "bg-rose-600 text-white shadow-md shadow-rose-600/20"
                : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/50"
            )}
          >
            <AlertOctagon size={14} />
            <span>4/4 Séances ({criticalCount})</span>
          </button>
          <button
            onClick={() => setFilterType('warning')}
            className={cn(
              "px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 whitespace-nowrap",
              filterType === 'warning'
                ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/50"
            )}
          >
            <Clock size={14} />
            <span>3/4 Séances ({warningCount})</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className={cn("absolute top-1/2 -translate-y-1/2 text-slate-400", isRTL ? "right-3.5" : "left-3.5")} size={18} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par élève, classe ou téléphone..."
            className={cn(
              "w-full py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-slate-400",
              isRTL ? "pr-10 pl-4 text-right" : "pl-10 pr-4"
            )}
          />
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {filteredNotifications.length === 0 ? (
          <div className="bg-white p-14 rounded-3xl shadow-sm text-center flex flex-col items-center gap-4 border border-slate-100">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center">
              <CheckCircle2 size={40} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800">
                {notifications.length === 0 ? "Tout est en règle !" : "Aucun résultat trouvé"}
              </h3>
              <p className="text-slate-400 font-medium text-xs mt-1 max-w-md">
                {notifications.length === 0 
                  ? "Tous les élèves ayant complété 3 ou 4 séances sont à jour avec leurs paiements pour ce mois."
                  : "Aucune alerte ne correspond à vos critères de recherche."}
              </p>
            </div>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const isCritical = notif.urgency === 'critical';
            const isProcessing = processingId === notif.id;

            return (
              <div 
                key={notif.id}
                className={cn(
                  "bg-white p-5 sm:p-6 rounded-3xl shadow-xs border transition-all hover:shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-5",
                  isCritical ? "border-rose-200 bg-rose-50/20" : "border-amber-200 bg-amber-50/10",
                  notif.isRead && "opacity-85",
                  isRTL && "md:flex-row-reverse"
                )}
              >
                {/* Left block: Icon + Info */}
                <div className={cn("flex items-start gap-4 flex-1 min-w-0", isRTL && "flex-row-reverse text-right")}>
                  {/* Icon Indicator */}
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs",
                    isCritical ? "bg-rose-500 text-white" : "bg-amber-500 text-white"
                  )}>
                    {isCritical ? <AlertOctagon size={24} /> : <AlertTriangle size={24} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Header line: Badges */}
                    <div className={cn("flex flex-wrap items-center gap-2 mb-1.5", isRTL && "flex-row-reverse")}>
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                        isCritical ? "bg-rose-100 text-rose-800 border border-rose-200" : "bg-amber-100 text-amber-800 border border-amber-200"
                      )}>
                        {isCritical ? "4/4 Séances • Impayé" : "3/4 Séances • Renouvellement"}
                      </span>

                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200">
                        Mois {notif.month}
                      </span>

                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-primary/10 text-primary border border-primary/20">
                        {notif.className}
                      </span>

                      {notif.tokenId && (
                        <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-black bg-slate-200/80 text-slate-700">
                          {notif.tokenId}
                        </span>
                      )}
                    </div>

                    {/* Student Name */}
                    <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2 truncate">
                      <span>{notif.studentName}</span>
                    </h3>

                    {/* Attendance breakdown pills */}
                    <div className={cn("flex items-center gap-2 mt-2 text-xs font-bold text-slate-600", isRTL && "flex-row-reverse")}>
                      <span className="text-[11px] text-slate-400 uppercase font-black tracking-wider">Séances faites:</span>
                      <div className="flex items-center gap-1.5">
                        {notif.sessions.slice(0, 4).map((s, idx) => {
                          const isDone = s === true || s === 'present';
                          const isAbs = s === 'absent';
                          return (
                            <span
                              key={idx}
                              className={cn(
                                "w-6 h-6 rounded-lg text-[10px] font-black flex items-center justify-center border",
                                isDone ? "bg-emerald-500 text-white border-emerald-600" :
                                isAbs ? "bg-rose-500 text-white border-rose-600" :
                                "bg-slate-100 text-slate-400 border-slate-200"
                              )}
                              title={`Séance ${idx + 1}: ${isDone ? 'Présent' : isAbs ? 'Absent' : 'Non effectuée'}`}
                            >
                              {isDone ? "✓" : isAbs ? "✕" : `S${idx + 1}`}
                            </span>
                          );
                        })}
                      </div>
                      <span className="text-slate-400 text-[11px] font-semibold">
                        ({notif.presentCount} présent{notif.presentCount > 1 ? 's' : ''}, {notif.absentCount} absent{notif.absentCount > 1 ? 's' : ''})
                      </span>
                    </div>

                    {/* Phone details */}
                    <div className={cn("flex flex-wrap items-center gap-3 mt-2 text-xs font-semibold text-slate-500", isRTL && "flex-row-reverse")}>
                      <span className="flex items-center gap-1 text-slate-700 font-bold">
                        📞 {notif.parentPhone}
                      </span>
                      {notif.secondaryPhone && (
                        <span>📱 Tél 2: {notif.secondaryPhone}</span>
                      )}
                      <span className="text-primary font-black">
                        Montant: {notif.classPrice} {t('currency')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right block: Action buttons */}
                <div className={cn("flex flex-wrap sm:flex-nowrap items-center gap-2 w-full md:w-auto shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100", isRTL && "flex-row-reverse")}>
                  {/* Phone Call */}
                  {notif.parentPhone && (
                    <a
                      href={`tel:${notif.parentPhone}`}
                      className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition-all font-bold text-xs flex items-center justify-center gap-1.5"
                      title="Appeler le parent"
                    >
                      <Phone size={16} />
                    </a>
                  )}

                  {/* WhatsApp Quick Message */}
                  {notif.parentPhone && (
                    <a
                      href={`https://wa.me/${notif.parentPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                        `Bonjour, nous vous informons que ${notif.studentName} a complété ses séances pour le mois ${notif.month} dans la classe ${notif.className}. Merci de régler le renouvellement (${notif.classPrice} DA). Everest Academy.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-2xl transition-all font-bold text-xs flex items-center justify-center gap-1.5"
                      title="Envoyer un rappel WhatsApp"
                    >
                      <MessageCircle size={16} />
                    </a>
                  )}

                  {/* Mark as Paid Direct Button */}
                  <button
                    type="button"
                    onClick={() => handleMarkAsPaid(notif)}
                    disabled={isProcessing}
                    className="flex-1 sm:flex-none px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs transition-all shadow-md shadow-emerald-600/20 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Check size={16} className="stroke-[3]" />
                    )}
                    <span>Encaisser {notif.classPrice} DA</span>
                  </button>

                  {/* Go to Class */}
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem('everest_selected_class_id', notif.classId);
                      navigate('/classes');
                    }}
                    className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition-all font-bold text-xs flex items-center justify-center"
                    title="Voir la classe"
                  >
                    <ArrowRight size={16} className={cn(isRTL && "rotate-180")} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
