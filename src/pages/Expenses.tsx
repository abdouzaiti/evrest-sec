import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Receipt, 
  Building2, 
  Zap, 
  Wrench, 
  ShoppingBag, 
  Megaphone, 
  Landmark, 
  HelpCircle,
  Calendar,
  FileSpreadsheet,
  PieChart,
  PiggyBank,
  Coins,
  CheckCircle2,
  Edit2,
  Sparkles,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';
import { Modal } from '../components/Modal';
import { Expense, ExpenseCategory, Student, Teacher, SchoolClass, RentVaultConfig, RentVaultDeposit } from '../types';
import { expensesService, studentsService, teachersService, classesService, rentVaultService } from '../services/supabaseService';

const CATEGORY_CONFIG: Record<ExpenseCategory, { label: string; icon: React.ElementType; color: string }> = {
  rent: { label: 'Loyer des locaux', icon: Building2, color: 'bg-amber-50 text-amber-700 border-amber-200' },
  utilities: { label: 'Électricité, Eau & Web', icon: Zap, color: 'bg-blue-50 text-blue-700 border-blue-200' },
  salaries: { label: 'Salaires & Primes', icon: DollarSign, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  supplies: { label: 'Fournitures & Matériel', icon: ShoppingBag, color: 'bg-purple-50 text-purple-700 border-purple-200' },
  maintenance: { label: 'Maintenance & Entretien', icon: Wrench, color: 'bg-orange-50 text-orange-700 border-orange-200' },
  marketing: { label: 'Marketing & Pub', icon: Megaphone, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  taxes: { label: 'Taxes & Impôts', icon: Landmark, color: 'bg-rose-50 text-rose-700 border-rose-200' },
  other: { label: 'Autres charges', icon: HelpCircle, color: 'bg-slate-50 text-slate-700 border-slate-200' },
};

const MONTH_NAMES_AR = [
  'يناير (Jan)', 'فبراير (Feb)', 'مارس (Mar)', 'أبريل (Apr)', 
  'ماي (May)', 'يونيو (Jun)', 'يوليو (Jul)', 'أوت (Aug)', 
  'سبتمبر (Sep)', 'أكتوبر (Oct)', 'نوفمبر (Nov)', 'ديسمبر (Dec)'
];

const MONTH_NAMES_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 
  'Mai', 'Juin', 'Juillet', 'Août', 
  'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export function Expenses() {
  const { t, isRTL } = useLanguage();
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [rentVault, setRentVault] = useState<RentVaultConfig>({ targetAnnualRent: 180000, deposits: [] });
  const [isLoading, setIsLoading] = useState(true);

  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [showRentVaultDetails, setShowRentVaultDetails] = useState(true);

  // Add Expense Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] = useState<ExpenseCategory>('utilities');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newNotes, setNewNotes] = useState('');

  // Edit Expense Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState<ExpenseCategory>('utilities');
  const [editDate, setEditDate] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Rent Vault Modal State
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMonth, setDepositMonth] = useState(new Date().getMonth() + 1);
  const [depositNote, setDepositNote] = useState('');

  // Target Rent Edit Modal
  const [isEditTargetModalOpen, setIsEditTargetModalOpen] = useState(false);
  const [editTargetRentAmount, setEditTargetRentAmount] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [expData, studData, teachData, classData, vaultData] = await Promise.all([
        expensesService.getAll(),
        studentsService.getAll(),
        teachersService.getAll(),
        classesService.getAll(),
        rentVaultService.getConfig()
      ]);
      setExpenses(expData);
      setStudents(studData);
      setTeachers(teachData);
      setClasses(classData);
      setRentVault(vaultData);
      setEditTargetRentAmount(String(vaultData.targetAnnualRent));
    } catch (err) {
      console.error('Failed to load expenses or financial data', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculations for Financial P&L
  const classMap = new Map<string, SchoolClass>(classes.map(c => [c.id, c]));

  // Total student revenue calculated for the selected year
  const totalRevenue = students.reduce((acc, student) => {
    const cls = classMap.get(student.classId);
    const price = cls ? cls.price : 2000;
    const paidCount = student.paidMonths ? student.paidMonths.length : 0;
    return acc + (paidCount * price);
  }, 0);

  // Filter expenses for selected year
  const yearExpenses = expenses.filter(e => e.year === selectedYear || new Date(e.date).getFullYear() === selectedYear);

  // Total operating expenses logged by manager
  const loggedExpensesTotal = yearExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Teacher payroll for the year
  const teacherPayrollTotal = teachers.reduce((sum, teacher) => {
    const monthsPaid = teacher.paidMonths ? teacher.paidMonths.length : (teacher.paymentStatus === 'Paid' ? 1 : 0);
    return sum + (teacher.salary * monthsPaid);
  }, 0);

  // Rent Piggy Bank (Hassala) calculation for selected year
  const yearVaultDeposits = rentVault.deposits.filter(d => d.year === selectedYear || new Date(d.date).getFullYear() === selectedYear);
  const totalSavedInVault = yearVaultDeposits.reduce((acc, d) => acc + d.amount, 0);
  const targetRent = rentVault.targetAnnualRent || 180000;
  const vaultProgressPercent = Math.min(100, Math.round((totalSavedInVault / targetRent) * 100));
  const remainingRentToSave = Math.max(0, targetRent - totalSavedInVault);
  const isVaultCompleted = totalSavedInVault >= targetRent;
  const suggestedMonthlySavings = Math.round(targetRent / 12);

  // Grand Total Expenses (including or excluding saved rent fund depending on manager preference)
  const grandTotalExpenses = loggedExpensesTotal + teacherPayrollTotal;

  // Net Profit or Loss (Madaqhil - Massarif)
  const netProfitOrLoss = totalRevenue - grandTotalExpenses;
  const netProfitAfterRentVault = netProfitOrLoss - totalSavedInVault; // Liquid profit after setting aside rent
  const isProfit = netProfitOrLoss >= 0;
  const profitMarginPercent = totalRevenue > 0 ? ((netProfitOrLoss / totalRevenue) * 100).toFixed(1) : '0';

  // Category breakdown for summary chart
  const categoryBreakdown = (Object.keys(CATEGORY_CONFIG) as ExpenseCategory[]).map(cat => {
    const catExpenses = yearExpenses.filter(e => e.category === cat);
    const total = catExpenses.reduce((s, e) => s + e.amount, 0);
    return { category: cat, total, count: catExpenses.length };
  }).filter(c => c.total > 0);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newAmount || Number(newAmount) <= 0) return;

    setIsSubmitting(true);
    try {
      const expenseDate = new Date(newDate);
      const created = await expensesService.create({
        title: newTitle.trim(),
        amount: Number(newAmount),
        category: newCategory,
        date: newDate,
        month: expenseDate.getMonth() + 1,
        year: expenseDate.getFullYear(),
        notes: newNotes.trim()
      });

      setExpenses(prev => [created, ...prev]);
      setIsAddModalOpen(false);
      setNewTitle('');
      setNewAmount('');
      setNewNotes('');
    } catch (err) {
      console.error('Failed to create expense', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm(isRTL ? 'هل أنت تأكد من حذف هذا المصروف؟' : 'Voulez-vous vraiment supprimer cette charge ?')) return;
    try {
      await expensesService.delete(id);
      setExpenses(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      console.error('Failed to delete expense', err);
    }
  };

  const handleStartEdit = (expense: Expense) => {
    setEditingExpenseId(expense.id);
    setEditTitle(expense.title);
    setEditAmount(String(expense.amount));
    setEditCategory(expense.category);
    setEditDate(expense.date);
    setEditNotes(expense.notes || '');
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpenseId || !editTitle.trim() || !editAmount || Number(editAmount) <= 0) return;

    setIsSubmitting(true);
    try {
      const expenseDate = new Date(editDate);
      const updated = await expensesService.update(editingExpenseId, {
        title: editTitle.trim(),
        amount: Number(editAmount),
        category: editCategory,
        date: editDate,
        month: expenseDate.getMonth() + 1,
        year: expenseDate.getFullYear(),
        notes: editNotes.trim()
      });

      setExpenses(prev => prev.map(exp => exp.id === editingExpenseId ? updated : exp));
      setIsEditModalOpen(false);
      setEditingExpenseId(null);
    } catch (err) {
      console.error('Failed to update expense', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddVaultDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositAmount || Number(depositAmount) <= 0) return;

    setIsSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const updatedVault = await rentVaultService.addDeposit({
        amount: Number(depositAmount),
        date: today,
        month: Number(depositMonth),
        year: selectedYear,
        note: depositNote.trim() || (isRTL 
          ? `اقتطاع شهري للحصالة - شهر ${MONTH_NAMES_AR[depositMonth - 1] || depositMonth}`
          : `Épargne mensuelle du loyer - ${MONTH_NAMES_FR[depositMonth - 1] || depositMonth}`)
      });

      setRentVault(updatedVault);
      setIsDepositModalOpen(false);
      setDepositAmount('');
      setDepositNote('');
    } catch (err) {
      console.error('Failed to add deposit to rent piggy bank', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVaultDeposit = async (id: string) => {
    if (!window.confirm(isRTL ? 'هل تريد سحب/حذف هذا الاقتطاع من حصالة الكراء؟' : 'Supprimer cette contribution du coffre du loyer ?')) return;
    try {
      const updatedVault = await rentVaultService.deleteDeposit(id);
      setRentVault(updatedVault);
    } catch (err) {
      console.error('Failed to delete vault deposit', err);
    }
  };

  const handleUpdateTargetRent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTargetRentAmount || Number(editTargetRentAmount) <= 0) return;

    setIsSubmitting(true);
    try {
      const updatedVault = await rentVaultService.updateTarget(Number(editTargetRentAmount));
      setRentVault(updatedVault);
      setIsEditTargetModalOpen(false);
    } catch (err) {
      console.error('Failed to update target rent amount', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredExpenses = yearExpenses.filter(exp => {
    const matchesSearch = exp.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (exp.notes && exp.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategoryFilter === 'all' || exp.category === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4", isRTL && "sm:flex-row-reverse")}>
        <div>
          <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center shrink-0 border border-rose-100">
              <Receipt size={26} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-primary tracking-tight">
                {isRTL ? 'إدارة المصاريف' : 'Gestion des Charges'}
              </h1>

            </div>
          </div>
        </div>

        <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-2xl border-2 border-slate-100 shadow-sm">
            <Calendar size={18} className="text-slate-400" />
            <span className="text-xs font-bold text-slate-500">Année:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-sm font-black text-primary focus:outline-none cursor-pointer"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
            </select>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-2xl font-bold text-sm shadow-lg shadow-rose-600/20 transition-all active:scale-95"
          >
            <Plus size={18} />
            <span>Ajouter une Charge</span>
          </button>
        </div>
      </div>



      {/* Main Financial Overview Cards (Madaqhil vs Massarif vs Net Profit/Loss) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Revenues */}
        <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Recettes Étudiants
            </span>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
              <TrendingUp size={22} />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {totalRevenue.toLocaleString()} <span className="text-sm font-bold text-slate-400">{t('currency')}</span>
            </p>
            <p className="text-xs font-semibold text-emerald-600 mt-1 flex items-center gap-1">
              <span>✓</span> Calculé d'après les cotisations
            </p>
          </div>
        </div>

        {/* Operating Expenses */}
        <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Charges d'Exploitation
            </span>
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
              <Receipt size={22} />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tight">
              {loggedExpensesTotal.toLocaleString()} <span className="text-sm font-bold text-slate-400">{t('currency')}</span>
            </p>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              {yearExpenses.length} charges enregistrées
            </p>
          </div>
        </div>

        {/* Teacher Payroll */}
        <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Masse Salariale
            </span>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <DollarSign size={22} />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-2xl sm:text-3xl font-black text-indigo-900 tracking-tight">
              {teacherPayrollTotal.toLocaleString()} <span className="text-sm font-bold text-slate-400">{t('currency')}</span>
            </p>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              {teachers.length} enseignants
            </p>
          </div>
        </div>

        {/* Profit or Loss Indicator Card */}
        <div className={cn(
          "p-6 rounded-3xl border-2 shadow-md relative overflow-hidden flex flex-col justify-between transition-all",
          isProfit 
            ? "bg-emerald-900 text-white border-emerald-800" 
            : "bg-rose-950 text-white border-rose-800"
        )}>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-200/80 uppercase tracking-wider">
                Résultat Net (Bilan)
              </span>
              <div className={cn("p-2 rounded-xl text-white", isProfit ? "bg-emerald-700/60" : "bg-rose-800/80")}>
                {isProfit ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
              </div>
            </div>

            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black tracking-tight">
                  {netProfitOrLoss > 0 ? `+${netProfitOrLoss.toLocaleString()}` : netProfitOrLoss.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-emerald-200/80">{t('currency')}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
            <span className={cn(
              "px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1",
              isProfit ? "bg-emerald-500/30 text-emerald-200 border border-emerald-400/30" : "bg-rose-500/30 text-rose-200 border border-rose-400/30"
            )}>
              {isProfit ? (
                <><span>✓</span> Profit Net</>
              ) : (
                <><span>⚠</span> Déficit</>
              )}
            </span>
            <span className="text-xs font-semibold opacity-80">
              Liquides: {netProfitAfterRentVault.toLocaleString()} DA
            </span>
          </div>
        </div>
      </div>

      {/* Breakdown Box & Formula */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-accent">
              <PieChart size={14} />
              <span>Calculateur de Bilan</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Comment le résultat financier est-il calculé ?
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Résultat = Recettes cotisations - (Masse salariale + Charges d'exploitation globales).
            </p>
          </div>

          <div className="w-full lg:w-auto bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2 font-mono text-xs text-slate-200">
            <div className="flex justify-between items-center gap-6">
              <span className="text-emerald-400 font-bold">+ Recettes:</span>
              <span>{totalRevenue.toLocaleString()} {t('currency')}</span>
            </div>
            <div className="flex justify-between items-center gap-6">
              <span className="text-rose-400 font-bold">- Salaires:</span>
              <span>{teacherPayrollTotal.toLocaleString()} {t('currency')}</span>
            </div>
            <div className="flex justify-between items-center gap-6">
              <span className="text-rose-400 font-bold">- Charges:</span>
              <span>{loggedExpensesTotal.toLocaleString()} {t('currency')}</span>
            </div>
            <div className="pt-2 border-t border-white/20 flex justify-between items-center gap-6 text-sm font-bold">
              <span className={isProfit ? "text-emerald-400" : "text-rose-400"}>
                = {isProfit ? 'Profit Net' : 'Perte Nette'}:
              </span>
              <span className={isProfit ? "text-emerald-400" : "text-rose-400"}>
                {netProfitOrLoss.toLocaleString()} {t('currency')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Distribution Breakdown */}
      {categoryBreakdown.length > 0 && (
        <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm space-y-4">
          <h3 className={cn("text-base font-bold text-primary flex items-center gap-2", isRTL && "flex-row-reverse")}>
            <FileSpreadsheet size={18} className="text-accent" />
            <span>{isRTL ? 'توزيع المصاريف حسب الفئات' : 'Répartition des charges par catégorie'}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {categoryBreakdown.map((item) => {
              const conf = CATEGORY_CONFIG[item.category];
              const percentage = loggedExpensesTotal > 0 ? ((item.total / loggedExpensesTotal) * 100).toFixed(0) : '0';
              const Icon = conf.icon;

              return (
                <div key={item.category} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={cn("px-2.5 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5", conf.color)}>
                      <Icon size={14} />
                      {conf.label}
                    </span>
                    <span className="text-xs font-bold text-slate-400">{percentage}%</span>
                  </div>
                  <p className="text-lg font-black text-slate-800">
                    {item.total.toLocaleString()} <span className="text-xs text-slate-400">{t('currency')}</span>
                  </p>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-rose-500 h-full rounded-full" style={{ width: `${percentage}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters & Expenses List */}
      <div className="bg-white rounded-3xl border-2 border-slate-100 shadow-sm overflow-hidden p-6 space-y-6">
        <div className={cn("flex flex-col sm:flex-row items-center justify-between gap-4", isRTL && "sm:flex-row-reverse")}>
          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className={cn("absolute top-3 text-slate-400", isRTL ? "right-3" : "left-3")} size={18} />
            <input
              type="text"
              placeholder={isRTL ? 'بحث في المصاريف...' : 'Rechercher une charge...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "w-full bg-slate-50 border border-slate-200 py-2.5 rounded-2xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20",
                isRTL ? "pr-10 pl-4" : "pl-10 pr-4"
              )}
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 custom-scrollbar">
            <button
              onClick={() => setSelectedCategoryFilter('all')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all",
                selectedCategoryFilter === 'all' ? "bg-primary text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {isRTL ? 'الكل' : 'Tous'}
            </button>
            {(Object.keys(CATEGORY_CONFIG) as ExpenseCategory[]).map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategoryFilter(cat)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border",
                  selectedCategoryFilter === cat ? "bg-primary text-white shadow-sm border-primary" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                )}
              >
                {CATEGORY_CONFIG[cat].label}
              </button>
            ))}
          </div>
        </div>

        {/* Expenses Table */}
        <div className="overflow-x-auto w-full">
          {filteredExpenses.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                <Receipt size={32} />
              </div>
              <p className="text-slate-600 font-bold text-base">
                {isRTL ? 'لا توجد مصاريف مسجلة لهذه الفئة أو السنة' : 'Aucune charge enregistrée pour cette sélection.'}
              </p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="text-xs font-bold text-rose-600 hover:underline"
              >
                + {isRTL ? 'إضافة مصروف جديد الآن' : 'Ajouter une charge maintenant'}
              </button>
            </div>
          ) : (
            <table className={cn("w-full text-left min-w-[650px]", isRTL && "text-right")}>
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                  <th className="px-6 py-4">{isRTL ? 'عنوان المصروف' : 'Intitulé de la charge'}</th>
                  <th className="px-6 py-4">{isRTL ? 'الفئة' : 'Catégorie'}</th>
                  <th className="px-6 py-4">{isRTL ? 'المبلغ (د.ج)' : 'Montant'}</th>
                  <th className="px-6 py-4">{isRTL ? 'التاريخ' : 'Date'}</th>
                  <th className="px-6 py-4">{isRTL ? 'ملاحظات' : 'Notes'}</th>
                  <th className="px-6 py-4 text-center">{isRTL ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                {filteredExpenses.map((expense) => {
                  const categoryConf = CATEGORY_CONFIG[expense.category] || CATEGORY_CONFIG.other;
                  const Icon = categoryConf.icon;

                  return (
                    <tr key={expense.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-black text-slate-900">
                        {expense.title}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn("px-2.5 py-1 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5", categoryConf.color)}>
                          <Icon size={14} />
                          {categoryConf.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-black text-rose-600">
                        {expense.amount.toLocaleString()} <span className="text-xs text-slate-400 font-normal">{t('currency')}</span>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-500">
                        {expense.date}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate">
                        {expense.notes || '—'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleStartEdit(expense)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                            title={isRTL ? 'تعديل' : 'Modifier'}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            title={isRTL ? 'حذف' : 'Supprimer'}
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
          )}
        </div>
      </div>

      {/* 🌟 Add Expense Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={isRTL ? 'إضافة مصروف جديد للمدرسة' : 'Ajouter une nouvelle charge'}
      >
        <form onSubmit={handleAddExpense} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              {isRTL ? 'عنوان / بيان المصروف' : 'Intitulé de la charge'} *
            </label>
            <input
              type="text"
              required
              placeholder={isRTL ? 'مثال: فاتورة الكهرباء، أدوات طباعة، صيانة قاعة' : 'Ex: Facture d\'électricité...'}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                {isRTL ? 'المبلغ بالدينار الجزائري (د.ج)' : 'Montant (DA)'} *
              </label>
              <input
                type="number"
                required
                min="1"
                placeholder="0"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                {isRTL ? 'فئة المصروف' : 'Catégorie'} *
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as ExpenseCategory)}
                className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              >
                {(Object.keys(CATEGORY_CONFIG) as ExpenseCategory[]).map(cat => (
                  <option key={cat} value={cat}>
                    {CATEGORY_CONFIG[cat].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              {isRTL ? 'تاريخ المصروف' : 'Date de la charge'} *
            </label>
            <input
              type="date"
              required
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              {isRTL ? 'ملاحظات وتفاصيل إضافية' : 'Notes supplémentaires'}
            </label>
            <textarea
              rows={2}
              placeholder={isRTL ? 'أي تفاصيل إضافية عن المصروف...' : 'Détails ou remarques...'}
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 resize-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors"
            >
              {isRTL ? 'إلغاء' : 'Annuler'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-2xl bg-rose-600 text-white font-bold text-xs shadow-lg shadow-rose-600/20 hover:bg-rose-700 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (isRTL ? 'جاري الحفظ...' : 'Enregistrement...') : (isRTL ? 'حفظ المصروف' : 'Enregistrer')}
            </button>
          </div>
        </form>
      </Modal>

      {/* 🌟 Edit Expense Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={isRTL ? 'تعديل المصروف' : 'Modifier la charge'}
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              {isRTL ? 'عنوان / بيان المصروف' : 'Intitulé de la charge'} *
            </label>
            <input
              type="text"
              required
              placeholder={isRTL ? 'مثال: فاتورة الكهرباء، أدوات طباعة، صيانة قاعة' : 'Ex: Facture d\'électricité...'}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                {isRTL ? 'المبلغ بالدينار الجزائري (د.ج)' : 'Montant (DA)'} *
              </label>
              <input
                type="number"
                required
                min="1"
                placeholder="0"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                {isRTL ? 'فئة المصروف' : 'Catégorie'} *
              </label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value as ExpenseCategory)}
                className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {(Object.keys(CATEGORY_CONFIG) as ExpenseCategory[]).map(cat => (
                  <option key={cat} value={cat}>
                    {CATEGORY_CONFIG[cat].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              {isRTL ? 'تاريخ المصروف' : 'Date de la charge'} *
            </label>
            <input
              type="date"
              required
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              {isRTL ? 'ملاحظات وتفاصيل إضافية' : 'Notes supplémentaires'}
            </label>
            <textarea
              rows={2}
              placeholder={isRTL ? 'أي تفاصيل إضافية عن المصروف...' : 'Détails ou remarques...'}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors"
            >
              {isRTL ? 'إلغاء' : 'Annuler'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-2xl bg-blue-600 text-white font-bold text-xs shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (isRTL ? 'جاري التحديث...' : 'Mise à jour...') : (isRTL ? 'حفظ التعديلات' : 'Enregistrer les modifications')}
            </button>
          </div>
        </form>
      </Modal>

      {/* 🌟 Add Deposit to Rent Vault Piggy Bank Modal */}
      <Modal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        title={isRTL ? 'وضع اقتطاع في حصالة الكراء السنوي 🏦' : 'Nouveau versement dans le coffre du loyer'}
      >
        <form onSubmit={handleAddVaultDeposit} className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1">
            <p className="font-bold">{isRTL ? '💡 الادخار الشهري للكراء:' : '💡 Épargne progressive du loyer:'}</p>
            <p>
              {isRTL 
                ? `تقتطع حسّالة الكراء مبالغ مالية شهرية لتصل إلى الهدف السنوي (${targetRent.toLocaleString()} د.ج).` 
                : `Ajoutez vos économies mensuelles pour atteindre l'objectif du loyer (${targetRent.toLocaleString()} DA).`}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              {isRTL ? 'المبلغ المقتطع وإيداعه في الحصالة (د.ج)' : 'Montant à ajouter au coffre (DA)'} *
            </label>
            <input
              type="number"
              required
              min="1"
              placeholder={isRTL ? `مثال: ${suggestedMonthlySavings}` : `Ex: ${suggestedMonthlySavings}`}
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              {isRTL ? 'الشهر المستهدف المقتطع منه' : 'Mois concerné'} *
            </label>
            <select
              value={depositMonth}
              onChange={(e) => setDepositMonth(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            >
              {(isRTL ? MONTH_NAMES_AR : MONTH_NAMES_FR).map((m, idx) => (
                <option key={idx + 1} value={idx + 1}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              {isRTL ? 'ملاحظة (اختياري)' : 'Note (optionnelle)'}
            </label>
            <input
              type="text"
              placeholder={isRTL ? 'مثال: اقتطاع فائدة شهر مارس للكراء' : 'Ex: Épargne du mois de Mars...'}
              value={depositNote}
              onChange={(e) => setDepositNote(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsDepositModalOpen(false)}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors"
            >
              {isRTL ? 'إلغاء' : 'Annuler'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-2xl bg-amber-600 text-white font-bold text-xs shadow-lg shadow-amber-600/20 hover:bg-amber-700 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (isRTL ? 'جاري الإيداع...' : 'Enregistrement...') : (isRTL ? 'إيداع في الحصالة' : 'Ajouter au coffre')}
            </button>
          </div>
        </form>
      </Modal>

      {/* 🌟 Edit Target Rent Amount Modal */}
      <Modal
        isOpen={isEditTargetModalOpen}
        onClose={() => setIsEditTargetModalOpen(false)}
        title={isRTL ? 'تعديل قيمة الكراء السنوي للمدرسة' : 'Modifier le montant du loyer annuel'}
      >
        <form onSubmit={handleUpdateTargetRent} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              {isRTL ? 'مبلغ الكراء السنوي الإجمالي (د.ج)' : 'Loyer annuel total (DA)'} *
            </label>
            <input
              type="number"
              required
              min="1"
              value={editTargetRentAmount}
              onChange={(e) => setEditTargetRentAmount(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              {isRTL ? 'مثال: 180,000 د.ج لكامل السنة' : 'Ex: 180,000 DA pour toute l\'année'}
            </p>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsEditTargetModalOpen(false)}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors"
            >
              {isRTL ? 'إلغاء' : 'Annuler'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-2xl bg-primary text-white font-bold text-xs shadow-lg hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (isRTL ? 'جاري التحديث...' : 'Mise à jour...') : (isRTL ? 'حفظ المبلغ الجديد' : 'Enregistrer')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
