import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  UserSquare2, 
  TrendingUp, 
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Loader2
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import { studentsService, teachersService, classesService } from '../services/supabaseService';

function StatCard({ title, value, change, icon: Icon, trend }: any) {
  const { isRTL } = useLanguage();
  return (
    <div className={cn(
      "py-6 group",
      isRTL && "text-right"
    )}>
      <div className={cn("flex items-center justify-between mb-4", isRTL && "flex-row-reverse")}>
        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-primary transition-all group-hover:scale-110">
          <Icon size={24} />
        </div>
        <div className={cn(
          "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
          trend === 'up' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600",
          isRTL && "flex-row-reverse"
        )}>
          {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {change}
        </div>
      </div>
      <div>
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{title}</p>
        <h3 className="text-2xl md:text-4xl font-black text-primary mt-2 tracking-tighter">{value}</h3>
      </div>
    </div>
  );
}

export function Dashboard() {
  const { t, isRTL } = useLanguage();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    revenue: 0,
    pending: 0
  });
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setConfigError(null);
      const [students, teachers, classes] = await Promise.all([
        studentsService.getAll(),
        teachersService.getAll(),
        classesService.getAll()
      ]);

      const paidStudents = students.filter(s => s.paymentStatus === 'Paid');
      const pendingStudents = students.filter(s => s.paymentStatus === 'Pending');
      
      // Calculate revenue based on classes price and paid students
      let totalRevenue = 0;
      students.forEach(s => {
        if (s.paymentStatus === 'Paid') {
          const studentClass = classes.find(c => c.id === s.classId);
          if (studentClass) totalRevenue += studentClass.price;
        }
      });

      setStats({
        students: students.length,
        teachers: teachers.length,
        revenue: totalRevenue,
        pending: pendingStudents.length
      });
    } catch (error: any) {
      console.error('Error fetching stats:', error);
      if (error.message?.includes('Supabase credentials missing')) {
        setConfigError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

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
          onClick={fetchStats}
          className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20"
        >
          {isRTL ? "Réessayer" : "Check Again"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-16 animate-in font-sans">
      <header className={cn("flex flex-col gap-2", isRTL && "items-end")}>
        <h1 className="text-3xl md:text-5xl font-black text-primary tracking-tighter">{t('overview')}</h1>
        <p className="text-slate-500 text-base md:text-lg">{t('welcome_back')}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard 
          title={t('total_students')} 
          value={stats.students} 
          change="+0%" 
          icon={Users} 
          trend="up" 
        />
        <StatCard 
          title={t('total_teachers')} 
          value={stats.teachers} 
          change="+0%" 
          icon={UserSquare2} 
          trend="up" 
        />
        <StatCard 
          title={t('monthly_revenue')} 
          value={`${stats.revenue.toLocaleString()} ${t('currency')}`} 
          change="+0%" 
          icon={TrendingUp} 
          trend="up" 
        />
        <StatCard 
          title={t('pending_payments')} 
          value={stats.pending} 
          change="+0%" 
          icon={AlertCircle} 
          trend="down" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 md:gap-20">
        <div className="flex flex-col">
          <h2 className={cn("text-2xl font-black text-primary mb-10 tracking-tighter", isRTL && "text-right")}>{t('real_time_alerts')}</h2>
          <div className="space-y-8 flex-1">
            {[
              { title: 'Paiements en retard', desc: `${stats.pending} étudiants ont des frais impayés.`, type: 'danger' },
              { title: 'Réunion du personnel', desc: 'Salle principale à 14h00 aujourd\'hui.', type: 'info' },
              { title: 'Alerte Stock', desc: 'Fournitures labo en baisse.', type: 'warning' },
              { title: 'Succès Examens', desc: 'Les résultats de Grade 12 sont prêts.', type: 'success' },
            ].map((alert, i) => (
              <div key={i} className={cn(
                "flex gap-6 group",
                isRTL && "flex-row-reverse text-right"
              )}>
                <div className={cn(
                  "w-1.5 h-auto rounded-full shrink-0",
                  alert.type === 'danger' ? "bg-rose-500" :
                  alert.type === 'warning' ? "bg-accent" :
                  alert.type === 'success' ? "bg-emerald-500" : "bg-primary"
                )} />
                <div className="flex-1">
                  <h4 className="text-base font-black text-primary group-hover:text-accent transition-colors">{alert.title}</h4>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed font-medium">{alert.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <button 
            onClick={() => navigate('/notifications')}
            className={cn(
              "mt-12 text-sm font-black text-primary hover:text-accent transition-colors inline-flex items-center gap-2",
              isRTL && "flex-row-reverse"
            )}
          >
            {t('view_all')}
            <ArrowUpRight size={18} className={cn(isRTL && "rotate-[180deg]")} />
          </button>
        </div>

        <div className="lg:col-span-2">
          <div className={cn("flex items-center justify-between mb-10", isRTL && "flex-row-reverse")}>
            <h2 className="text-2xl font-black text-primary tracking-tighter">{t('revenue_growth')}</h2>
            <select className="text-sm border-none bg-slate-50 rounded-xl px-4 py-2 outline-none text-slate-600 font-bold">
              <option>Derniers 6 mois</option>
              <option>Dernière année</option>
            </select>
          </div>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[
                { name: 'Jan', revenue: stats.revenue * 0.8 },
                { name: 'Feb', revenue: stats.revenue * 0.9 },
                { name: 'Mar', revenue: stats.revenue * 0.85 },
                { name: 'Apr', revenue: stats.revenue },
                { name: 'May', revenue: stats.revenue * 1.1 },
                { name: 'Jun', revenue: stats.revenue * 1.2 },
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
                  tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 600 }} 
                  reversed={isRTL}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 600 }} 
                  orientation={isRTL ? "right" : "left"}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  cursor={{ stroke: '#1A2F45', strokeWidth: 2, strokeDasharray: '5 5' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#1A2F45" 
                  strokeWidth={5} 
                  fillOpacity={1} 
                  fill="url(#colorRev)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

