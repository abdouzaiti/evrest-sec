import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  UserSquare2, 
  TrendingUp, 
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  CheckCircle2,
  Printer,
  UserPlus,
  Phone,
  Briefcase,
  Coins,
  Sparkles,
  Shield,
  CreditCard,
  Building,
  Activity,
  UserCheck,
  Check,
  X
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { studentsService, teachersService, classesService } from '../services/supabaseService';
import { isSupabaseConfigured } from '../lib/supabase';
import { Student, SchoolClass, Teacher } from '../types';

function StatCard({ title, value, change, icon: Icon, trend, subtext }: any) {
  const { isRTL } = useLanguage();
  return (
    <div className={cn(
      "bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all",
      isRTL && "text-right"
    )}>
      <div className={cn("flex items-center justify-between mb-4", isRTL && "flex-row-reverse")}>
        <div className="w-12 h-12 bg-primary/5 text-primary rounded-2xl flex items-center justify-center transition-all group-hover:scale-110">
          <Icon size={24} />
        </div>
        {change && (
          <div className={cn(
            "flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full",
            trend === 'up' ? "bg-emerald-50 text-emerald-600" :
            trend === 'down' ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600",
            isRTL && "flex-row-reverse"
          )}>
            {trend === 'up' ? <ArrowUpRight size={13} /> : trend === 'down' ? <ArrowDownRight size={13} /> : null}
            {change}
          </div>
        )}
      </div>
      <div>
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">{title}</p>
        <h3 className="text-2xl md:text-3xl font-black text-primary mt-2.5 tracking-tight">{value}</h3>
        {subtext && <p className="text-[11px] text-slate-400 mt-1 font-medium">{subtext}</p>}
      </div>
    </div>
  );
}

export function Dashboard() {
  const { t, isRTL } = useLanguage();
  const { activeRole, switchRole } = useAuth();
  const navigate = useNavigate();

  // Full datasets for smart display
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick form state
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regClassId, setRegClassId] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);

  // Search filter for outstanding payment lists
  const [unpaidSearch, setUnpaidSearch] = useState('');
  
  // Receipt mock modal
  const [receiptStudent, setReceiptStudent] = useState<Student | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastPaymentAlert, setLastPaymentAlert] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
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
    } catch (error) {
      console.error('Error fetching dashboard datasets:', error);
    } finally {
      setLoading(false);
    }
  };

  // Safe helper to find class price
  const getClassPrice = (classId: string) => {
    return classes.find(c => c.id === classId)?.price || 0;
  };

  const getClassClassName = (classId: string) => {
    return classes.find(c => c.id === classId)?.name || 'Unknown Class';
  };

  // Dynamic statistics
  const totalStudents = students.length;
  const totalTeachers = teachers.length;
  const totalClasses = classes.length;

  // Calcul d'argent récolté (Revenues)
  const paidStudents = students.filter(s => s.paymentStatus === 'Paid');
  const totalRevenue = paidStudents.reduce((acc, curr) => acc + getClassPrice(curr.classId), 0);

  // Calcul d'argent en attente (Outstanding pending)
  const pendingStudents = students.filter(s => s.paymentStatus === 'Pending' || s.paymentStatus === 'Unpaid');
  const outstandingRevenue = pendingStudents.reduce((acc, curr) => acc + getClassPrice(curr.classId), 0);

  // Confidential payroll info (Director Mohamed view only)
  const totalPayroll = teachers.reduce((acc, curr) => acc + curr.salary, 0);
  const schoolNetProfit = totalRevenue - totalPayroll;

  // Express Cash collector handler
  const handleCollectCash = async (studentId: string) => {
    try {
      const match = students.find(s => s.id === studentId);
      if (!match) return;

      const updated = await studentsService.updateStatus(studentId, 'Paid');
      
      // Update local state smoothly
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, paymentStatus: 'Paid' } : s));
      
      // Open receipt printed window
      setReceiptStudent(updated);
      setShowReceipt(true);
      
      setLastPaymentAlert(isRTL 
        ? `Encaissement réussi pour ${updated.name} ! Reçu généré.` 
        : `Successfully collected payment for ${updated.name}! Receipt printed.`
      );
      setTimeout(() => setLastPaymentAlert(null), 4000);
    } catch (e) {
      console.error(e);
    }
  };

  // Quick student registration form inside dashboard
  const handleQuickRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regPhone || !regClassId) return;

    try {
      setIsRegistering(true);
      const newStudent = await studentsService.create({
        name: regName,
        parentPhone: regPhone,
        paymentStatus: 'Pending',
        classId: regClassId
      });

      // Insert state natively
      setStudents(prev => [newStudent, ...prev]);
      setRegSuccess(isRTL 
        ? `Élève ${regName} inscrit avec succès !`
        : `Student ${regName} enrolled successfully!`
      );
      
      // Reset
      setRegName('');
      setRegPhone('');
      setRegClassId('');
      setTimeout(() => setRegSuccess(null), 3500);
    } catch (error) {
      console.error(error);
    } finally {
      setIsRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[65vh] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  // Bar chart of Class Roster statistics
  const classStatsChart = classes.map(c => {
    const studentsInClass = students.filter(s => s.classId === c.id);
    const paidInClass = studentsInClass.filter(s => s.paymentStatus === 'Paid');
    return {
      name: c.name.split(' ').slice(0, 2).join(' '),
      total: studentsInClass.length,
      paid: paidInClass.length
    };
  });

  return (
    <div className="space-y-12 animate-in font-sans">
      
      {/* Dynamic Sub-Header with Dual Role Switcher */}
      <div className={cn(
        "flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100",
        isRTL && "lg:flex-row-reverse"
      )}>
        <div className={cn(isRTL && "text-right")}>
          <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
            <span className="text-3xl md:text-5xl font-black text-primary tracking-tighter">
              {activeRole === 'director' 
                ? (isRTL ? "Espace Directeur" : "Executive Suites") 
                : (isRTL ? "Bureau Secrétariat" : "Operational Desk")}
            </span>
            <span className={cn(
              "text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border",
              activeRole === 'director' 
                ? "bg-amber-50 text-amber-700 border-amber-100" 
                : "bg-blue-50 text-blue-700 border-blue-100"
            )}>
              {activeRole === 'director' ? "Mohamed" : "Secretaries"}
            </span>
          </div>
          <p className="text-slate-500 mt-2 text-base font-medium">
            {activeRole === 'director' 
              ? (isRTL ? "Vue globale financière, structurelle et masse salariale." : "High-level school accounting and financial control panel.")
              : (isRTL ? "Enregistrements rapides, gestion des appels et encaissements des élèves." : "Daily interactive workspace: enrollments, collections, and receipt desk.")}
          </p>
        </div>

        {/* Unified Elegant Switch Toggle */}
        <div className={cn(
          "bg-slate-100 p-1.5 rounded-2xl flex items-center gap-1 shrink-0 self-start lg:self-center shadow-inner",
          isRTL && "flex-row-reverse"
        )}>
          <button
            onClick={() => switchRole('director')}
            className={cn(
              "px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2",
              activeRole === 'director' 
                ? "bg-white text-primary shadow-sm" 
                : "text-slate-500 hover:text-primary"
            )}
          >
            <Shield size={14} className={activeRole === 'director' ? "text-amber-500" : ""} />
            {isRTL ? "Dir. Mohamed" : "Dir. Mohamed"}
          </button>
          <button
            onClick={() => switchRole('secretary')}
            className={cn(
              "px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2",
              activeRole === 'secretary' 
                ? "bg-white text-primary shadow-sm" 
                : "text-slate-500 hover:text-primary"
            )}
          >
            <Activity size={14} className={activeRole === 'secretary' ? "text-blue-500" : ""} />
            {isRTL ? "Secrétaires" : "Secretaries"}
          </button>
        </div>
      </div>

      {/* Floating live alerts of cash registered */}
      {lastPaymentAlert && (
        <div className="bg-emerald-50 border-2 border-emerald-100 rounded-2xl p-4 flex items-center gap-3 text-emerald-800 text-sm font-black tracking-tight animate-bounce shadow-md">
          <CheckCircle2 size={20} className="text-emerald-500" />
          <span>{lastPaymentAlert}</span>
        </div>
      )}

      {/* ----------------- RENDER DIRECTEUR MOHAMED DASHBOARD ----------------- */}
      {activeRole === 'director' && (
        <div className="space-y-12 animate-in">
          
          {/* Executive Row of Director Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              title={t('total_students')} 
              value={totalStudents} 
              change={`${paidStudents.length} Payés`} 
              icon={Users} 
              trend="up" 
              subtext={isRTL ? "Élèves enregistrés en classe" : "Active classroom seats filled"}
            />
            <StatCard 
              title={t('total_teachers')} 
              value={totalTeachers} 
              change={`${teachers.filter(t => t.paymentStatus === 'Paid').length} Payés`} 
              icon={UserSquare2} 
              trend="up" 
              subtext={isRTL ? "Corps enseignant Everest" : "Instructors currently on staff"}
            />
            <StatCard 
              title={isRTL ? "Recettes Totales" : "Total School Revenue"} 
              value={`${totalRevenue.toLocaleString()} ${t('currency')}`} 
              change={`${outstandingRevenue.toLocaleString()} En attente`} 
              icon={TrendingUp} 
              trend="up" 
              subtext={isRTL ? "Exclu les frais en retard" : "Computed based on paid invoices"}
            />
            <StatCard 
              title={isRTL ? "Masse Salariale / Déficit" : "Confidential Staff Payroll"} 
              value={`${totalPayroll.toLocaleString()} ${t('currency')}`} 
              change={schoolNetProfit >= 0 ? `+${schoolNetProfit.toLocaleString()} Net` : `${schoolNetProfit.toLocaleString()} Net`}
              icon={Coins} 
              trend={schoolNetProfit >= 0 ? "up" : "down"} 
              subtext={isRTL ? "Coût total mensuel du personnel" : "Total expenses paid out of lessons"}
            />
          </div>

          {/* Business Insights Row (Bento Grid) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Class distribution visual (Directeur only) */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm col-span-1 flex flex-col justify-between">
              <div>
                <h3 className={cn("text-lg font-black text-primary tracking-tight", isRTL && "text-right")}>
                  {isRTL ? "Remplissage & Encaissements" : "Class Occupancy Analysis"}
                </h3>
                <p className={cn("text-xs text-slate-400 font-medium mt-1 mb-6", isRTL && "text-right")}>
                  {isRTL ? "Proportion d'étudiants ayant réglé leurs frais par niveau." : "Distribution of paid subscribers per class category."}
                </p>
              </div>

              {/* Mini responsive visual list */}
              <div className="space-y-4">
                {classes.map((c, i) => {
                  const items = students.filter(s => s.classId === c.id);
                  const paidCount = items.filter(s => s.paymentStatus === 'Paid').length;
                  const ratio = items.length > 0 ? (paidCount / items.length) * 100 : 0;
                  
                  return (
                    <div key={c.id} className={cn("space-y-1.5", isRTL && "text-right")}>
                      <div className={cn("flex justify-between items-end text-xs font-bold text-slate-700", isRTL && "flex-row-reverse")}>
                        <span className="truncate max-w-40 font-black">{c.name}</span>
                        <span className="text-slate-400 font-mono text-[10px]">
                          {paidCount}/{items.length} {isRTL ? "Payés" : "Paid"}
                        </span>
                      </div>
                      <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden border border-slate-100">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            ratio === 100 ? "bg-emerald-500" : ratio > 50 ? "bg-amber-500" : "bg-rose-500"
                          )}
                          style={{ width: `${ratio || 0}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-50 flex justify-end">
                <button
                  onClick={() => navigate('/classes')}
                  className="text-xs font-black text-primary hover:text-accent tracking-widest uppercase transition-colors"
                >
                  {isRTL ? "Gérer les tarifications →" : "Optimize Class Prices →"}
                </button>
              </div>
            </div>

            {/* Recharts Revenue & Collections Forecast charts */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm lg:col-span-2">
              <div className={cn("flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6", isRTL && "flex-row-reverse")}>
                <div>
                  <h3 className="text-lg font-black text-primary tracking-tight">
                    {isRTL ? "Performance Financière Annuelle" : "Strategic Balance Forecast"}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    {isRTL ? "Courbe comparée des recettes et de l'encaissement global." : "Real vs projected income stream comparison ledger."}
                  </p>
                </div>
                <div className="text-xs font-black bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl text-slate-500">
                  {isRTL ? "Année d'exercice Courante" : "Current Fiscal Semester"}
                </div>
              </div>

              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[
                    { name: 'Jan', revenue: totalRevenue * 0.7, payroll: totalPayroll },
                    { name: 'Feb', revenue: totalRevenue * 0.8, payroll: totalPayroll },
                    { name: 'Mar', revenue: totalRevenue * 0.85, payroll: totalPayroll },
                    { name: 'Apr', revenue: totalRevenue, payroll: totalPayroll },
                    { name: 'May', revenue: totalRevenue * 1.12, payroll: totalPayroll },
                    { name: 'Jun', revenue: totalRevenue * 1.25, payroll: totalPayroll },
                  ]} margin={{ top: 10, right: 10, left: isRTL ? 10 : -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1A2F45" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#1A2F45" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} 
                      reversed={isRTL}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} 
                      orientation={isRTL ? "right" : "left"}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#1A2F45" 
                      strokeWidth={4} 
                      fillOpacity={1} 
                      fill="url(#colorRev)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Table of outstanding teacher salaries & strategic notes */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className={cn("flex justify-between items-center mb-6 border-b border-slate-50 pb-4", isRTL && "flex-row-reverse")}>
              <div>
                <h3 className="text-lg font-black text-primary tracking-tight">
                  {isRTL ? "Contrôle des Salaires des Enseignants" : "Staff Remuneration & Payroll Ledger"}
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-1">
                  {isRTL ? "État confidentiel et statut de paiement des salaires" : "Strict confidential view: status of payments to staff members"}
                </p>
              </div>
              <button
                onClick={() => navigate('/teachers')}
                className="bg-primary/5 hover:bg-primary/10 text-primary font-bold text-xs px-4 py-2.5 rounded-xl transition-all"
              >
                {isRTL ? "Gérer les salaires →" : "Manage Payroll →"}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className={cn("w-full text-left font-sans text-sm", isRTL && "text-right")}>
                <thead>
                  <tr className="border-b border-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                    <th className="py-4 px-4">{isRTL ? "Enseignant" : "Instructor"}</th>
                    <th className="py-4 px-4">{isRTL ? "Spécialité" : "Subject"}</th>
                    <th className="py-4 px-4">{isRTL ? "Salaire de base" : "Base Salary"}</th>
                    <th className="py-4 px-4">{isRTL ? "Dernier versement" : "Last Paid Date"}</th>
                    <th className="py-4 px-4">{isRTL ? "Statut" : "Status"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-medium">
                  {teachers.map(t => (
                    <tr key={t.id} className="hover:bg-slate-55/10">
                      <td className="py-4 px-4 font-black text-primary">{t.name}</td>
                      <td className="py-4 px-4 font-medium text-slate-500">{t.subject}</td>
                      <td className="py-4 px-4 font-bold text-slate-900">{t.salary.toLocaleString()} {t.salary ? 'DA' : ''}</td>
                      <td className="py-4 px-4 text-slate-400 text-xs">{t.lastPaymentDate || (isRTL ? "Aucun versement" : "Pending payment")}</td>
                      <td className="py-4 px-4">
                        <span className={cn(
                          "px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full",
                          t.paymentStatus === 'Paid' ? "bg-emerald-50 text-emerald-700" :
                          t.paymentStatus === 'Pending' ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"
                        )}>
                          {t.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- RENDER SECRÉTAIRES DASHBOARD ----------------- */}
      {activeRole === 'secretary' && (
        <div className="space-y-12 animate-in">
          
          {/* Operational Secretary stats (No sensitive salary details) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <StatCard 
              title={isRTL ? "Élèves Scolarisés" : "Active Pupils Registered"} 
              value={totalStudents} 
              change={`${paidStudents.length} en règle`} 
              icon={Users} 
              trend="up" 
              subtext={isRTL ? "Effectif total de l'école" : "Total roster footprint"}
            />
            <StatCard 
              title={isRTL ? "Madaikhil El-Assassi (Frais Reçus)" : "Tuition Cash Collected"} 
              value={`${totalRevenue.toLocaleString()} ${t('currency')}`} 
              change={isRTL ? "Caisse de l'école" : "Validated cashier total"}
              icon={Coins} 
              trend="up" 
              subtext={isRTL ? "Montant total récolté à ce jour" : "Based strictly on student tuition"}
            />
            <StatCard 
              title={isRTL ? "Reste En Souffrance (Retards)" : "Outstanding Tuition Debts"} 
              value={`${outstandingRevenue.toLocaleString()} ${t('currency')}`} 
              change={`${pendingStudents.length} élèves restants`} 
              icon={AlertCircle} 
              trend="down" 
              subtext={isRTL ? "Frais de scolarité non payés" : "Target call & collection queue"}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            
            {/* Interactive Daily Cash Collection Console (Centerpiece) */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm lg:col-span-7 flex flex-col justify-between">
              <div>
                <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-50", isRTL && "flex-row-reverse")}>
                  <div>
                    <h3 className="text-lg font-black text-primary tracking-tight">
                      {isRTL ? "Guichet de Recouvrement Express" : "Desk Invoicing & Cash Register"}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium mt-1">
                      {isRTL ? "Cliquez pour valider le paiement d'un élève et générer son reçu" : "Direct cash register: accept tuition fees and print official receipts."}
                    </p>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-1.5 rounded-xl">
                    {isRTL ? "Traitement Direct" : "Instant DB Updates"}
                  </span>
                </div>

                {/* Filter field for unpaid students */}
                <div className="mb-6 relative">
                  <input
                    type="text"
                    value={unpaidSearch}
                    onChange={e => setUnpaidSearch(e.target.value)}
                    placeholder={isRTL ? "Rechercher un élève à encaisser..." : "Search pupil to collect payment..."}
                    className={cn(
                      "w-full px-4 py-3 bg-slate-50 text-sm font-bold rounded-2xl border border-slate-100 focus:outline-none focus:ring-4 focus:ring-primary/5 placeholder:text-slate-400 placeholder:font-bold",
                      isRTL && "text-right"
                    )}
                  />
                </div>

                {/* Outstanding collection items list */}
                <div className="space-y-4 max-h-[380px] overflow-y-auto pr-2">
                  {pendingStudents
                    .filter(s => s.name.toLowerCase().includes(unpaidSearch.toLowerCase()))
                    .length === 0 ? (
                      <div className="p-8 text-center text-slate-400 font-bold border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                        {isRTL ? "Aucun élève en retard ou ne correspondant à la recherche." : "No outstanding unpaid items matching."}
                      </div>
                    ) : (
                      pendingStudents
                        .filter(s => s.name.toLowerCase().includes(unpaidSearch.toLowerCase()))
                        .map(s => {
                          const val = getClassPrice(s.classId);
                          const clsName = getClassClassName(s.classId);
                          return (
                            <div 
                              key={s.id} 
                              className={cn(
                                "p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-slate-50/50 flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all group",
                                isRTL && "sm:flex-row-reverse text-right"
                              )}
                            >
                              <div className="space-y-1">
                                <h5 className="font-black text-primary text-base group-hover:text-primary/80 transition-all">{s.name}</h5>
                                <div className={cn("flex items-center gap-2.5 text-xs text-slate-400 font-bold", isRTL && "flex-row-reverse")}>
                                  <span className="text-secondary font-black text-[10px] uppercase tracking-wider bg-slate-200/60 px-2 py-0.5 rounded-md">{clsName}</span>
                                  <span className="flex items-center gap-1">
                                    <Phone size={11} />
                                    {s.parentPhone}
                                  </span>
                                </div>
                              </div>

                              <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse self-end sm:self-center")}>
                                <div className="text-right">
                                  <div className="font-extrabold text-slate-900 text-sm">{val.toLocaleString()} DA</div>
                                  <div className={cn("text-[10px] font-black uppercase text-rose-500", isRTL && "text-left")}>
                                    {s.paymentStatus === 'Pending' ? (isRTL ? 'Retard' : 'Pending') : (isRTL ? 'Non Payé' : 'Unpaid')}
                                  </div>
                                </div>

                                <button
                                  onClick={() => handleCollectCash(s.id)}
                                  className="bg-primary text-white font-black text-xs px-4 py-2.5 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-md shadow-primary/10 flex items-center gap-1.5"
                                >
                                  <Coins size={14} />
                                  <span>{isRTL ? "Encaisser Cash" : "Collect Cash"}</span>
                                </button>
                              </div>
                            </div>
                          );
                        })
                    )}
                </div>
              </div>

              {/* Live reminder help */}
              <div className={cn("mt-6 p-4 rounded-2xl bg-amber-50/70 border border-amber-100 flex gap-3 text-amber-900 text-xs font-semibold leading-relaxed", isRTL && "flex-row-reverse text-right")}>
                <span className="text-base select-none">📞</span>
                <div>
                  <h6 className="font-black text-amber-950 mb-0.5">{isRTL ? "Action Secrétariat : Phoning des Imback" : "Outstanding Call Reminders"}</h6>
                  <p className="text-slate-600">
                    {isRTL 
                      ? "Un parent tarde à payer ? Appuyez sur le bouton vert d'appel ou servez-vous du numéro affiché pour accélérer le recouvrement mensuel."
                      : "Click parent phone details above to rapidly phone outstanding tuition accounts."}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Student Registration Form Widget (Right Col) */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm lg:col-span-5 flex flex-col justify-between">
              <div>
                <div className={cn("pb-4 border-b border-slate-50 mb-6", isRTL && "text-right")}>
                  <h3 className="text-lg font-black text-primary tracking-tight">
                    {isRTL ? "Inscription Minute Élève" : "Quick Enrollment Office"}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    {isRTL ? "Inscrire un nouvel élève instantanément sans changer de page !" : "Directly enroll new students onto the rosters from here."}
                  </p>
                </div>

                {regSuccess && (
                  <div className="p-4 mb-6 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-bold rounded-2xl animate-fade-in flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <span>{regSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleQuickRegister} className="space-y-5">
                  <div className={cn("space-y-1.5", isRTL && "text-right")}>
                    <label className="text-xs font-black uppercase text-slate-500 tracking-wider">
                      {isRTL ? "Nom complet de l'élève" : "Student Full Name"}
                    </label>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={e => setRegName(e.target.value)}
                      placeholder="e.g. Samir Amokrane"
                      className={cn(
                        "w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-primary/5",
                        isRTL && "text-right"
                      )}
                    />
                  </div>

                  <div className={cn("space-y-1.5", isRTL && "text-right")}>
                    <label className="text-xs font-black uppercase text-slate-500 tracking-wider">
                      {isRTL ? "Numéro du Parent (Tél)" : "Parent Contact Phone"}
                    </label>
                    <input
                      type="tel"
                      required
                      value={regPhone}
                      onChange={e => setRegPhone(e.target.value)}
                      placeholder="e.g. 0555328912"
                      className={cn(
                        "w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-primary/5",
                        isRTL && "text-right"
                      )}
                    />
                  </div>

                  <div className={cn("space-y-1.5", isRTL && "text-right")}>
                    <label className="text-xs font-black uppercase text-slate-500 tracking-wider">
                      {isRTL ? "Académie / Classe Affectée" : "Class Destination"}
                    </label>
                    <select
                      required
                      value={regClassId}
                      onChange={e => setRegClassId(e.target.value)}
                      className={cn(
                        "w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-primary/5 text-slate-700",
                        isRTL && "text-right"
                      )}
                    >
                      <option value="">{isRTL ? "-- Sélectionner le cours --" : "-- Select class level --"}</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.price.toLocaleString()} DA)
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isRegistering}
                    className="w-full bg-primary hover:bg-primary/95 text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50 shadow-lg shadow-primary/10 flex items-center justify-center gap-2 group"
                  >
                    {isRegistering ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        <UserPlus size={16} />
                        <span>{isRTL ? "Inscrire l'Élève" : "Enlist & Register"}</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Operational Security Disclaimer */}
              <div className="mt-8 pt-6 border-t border-slate-50 flex items-center gap-2 text-[11px] text-slate-400 font-bold">
                <Shield size={14} className="text-slate-400" />
                <span>{isRTL ? "Certains accès restreints (Salaires confidentiels occultés)" : "Operational security wrapper active: Staff finances are hidden."}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- GORGEOUS MOCK RECEIPT MODAL ----------------- */}
      {showReceipt && receiptStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/45 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl overflow-hidden shadow-2xl max-w-md w-full border border-slate-100 relative max-h-[90vh] flex flex-col justify-between animate-in zoom-in-95 duration-200">
            
            {/* Header branding */}
            <div className="bg-primary text-white p-6 relative">
              <button 
                onClick={() => setShowReceipt(false)}
                className="absolute top-4 right-4 text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition-all"
              >
                <X size={18} />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white p-1.5 rounded-xl">
                  <img src="/logo.png" alt="Everest Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h4 className="font-black text-lg tracking-tight leading-none">Everest Academy</h4>
                  <span className="text-[9px] font-black uppercase text-accent tracking-widest mt-0.5 block">Official Payment Receipt</span>
                </div>
              </div>
            </div>

            {/* Invoice invoice detail content */}
            <div className="p-8 space-y-6 overflow-y-auto">
              <div className="text-center">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{isRTL ? "MONTANT ACQUITTÉ CASH" : "CASH PAYMENT RECEIVED"}</div>
                <div className="text-3xl font-black text-primary">
                  {getClassPrice(receiptStudent.classId).toLocaleString()} DA
                </div>
              </div>

              {/* Receipt meta specs */}
              <div className="bg-slate-50 p-4 rounded-2xl space-y-3.5 border border-slate-100 text-xs font-semibold">
                <div className={cn("flex justify-between items-center", isRTL && "flex-row-reverse")}>
                  <span className="text-slate-400">{isRTL ? "Élève Enregistré" : "Student Name"}</span>
                  <span className="font-extrabold text-primary">{receiptStudent.name}</span>
                </div>
                <div className={cn("flex justify-between items-center", isRTL && "flex-row-reverse")}>
                  <span className="text-slate-400">{isRTL ? "Classe de cours" : "Academic Class"}</span>
                  <span className="font-bold text-slate-700">{getClassClassName(receiptStudent.classId)}</span>
                </div>
                <div className={cn("flex justify-between items-center", isRTL && "flex-row-reverse")}>
                  <span className="text-slate-400">{isRTL ? "Téléphone Parent" : "Parent Phone"}</span>
                  <span className="font-mono text-slate-700">{receiptStudent.parentPhone}</span>
                </div>
                <div className={cn("flex justify-between items-center", isRTL && "flex-row-reverse")}>
                  <span className="text-slate-400">{isRTL ? "Statut du Versement" : "Payment Status"}</span>
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-lg">PAID / ACQUITTÉ</span>
                </div>
                <div className={cn("flex justify-between items-center border-t border-slate-100 pt-3 text-[10px]", isRTL && "flex-row-reverse")}>
                  <span className="text-slate-400">Receipt No:</span>
                  <span className="font-mono text-slate-500">EVR-{(receiptStudent.id || '0').slice(-6).toUpperCase()}-{Math.floor(Date.now() / 100000).toString().slice(-4)}</span>
                </div>
              </div>

              {/* Fineprint disclaimer */}
              <p className="text-[10px] text-center text-slate-400 font-medium leading-relaxed max-w-xs mx-auto">
                {isRTL 
                  ? "Ce document tient lieu de justificatif officiel de caisse. Le versement des frais de scolarité mensuels est non remboursable."
                  : "This document constitutes an official cash payment confirmation. Monthly tuition fees are subject to school policies."}
              </p>
            </div>

            {/* Action panel */}
            <div className="bg-slate-50 p-6 border-t border-slate-150 flex gap-3">
              <button 
                onClick={() => setShowReceipt(false)}
                className="flex-1 border border-slate-200 hover:border-slate-350 text-slate-700 font-bold py-3 rounded-2xl text-xs uppercase tracking-wider transition-all rounded-xl"
              >
                {isRTL ? "Fermer" : "Close Receipt"}
              </button>
              <button 
                onClick={() => window.print()}
                className="flex-1 bg-primary hover:bg-primary/95 text-white font-black py-3 rounded-2xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md shadow-primary/10 rounded-xl"
              >
                <Printer size={14} />
                <span>{isRTL ? "Imprimer Reçu" : "Print Receipt"}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
