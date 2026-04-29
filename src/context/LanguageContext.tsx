import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'fr' | 'ar' | 'en';

interface Translations {
  [key: string]: {
    [key in Language]: string;
  };
}

export const translations: Translations = {
  // Sidebar & Navigation
  dashboard: { fr: 'Tableau de bord', ar: 'لوحة التحكم', en: 'Dashboard' },
  classes: { fr: 'Classes', ar: 'الأقسام', en: 'Classes' },
  teachers: { fr: 'Enseignants', ar: 'الأساتذة', en: 'Teachers' },
  payments: { fr: 'Paiements', ar: 'المدفوعات', en: 'Payments' },
  notifications: { fr: 'Notifications', ar: 'الإشعارات', en: 'Notifications' },
  signOut: { fr: 'Déconnexion', ar: 'تسجيل الخروج', en: 'Sign Out' },
  
  // Dashboard
  overview: { fr: 'Aperçu', ar: 'نظرة عامة', en: 'Overview' },
  welcome_back: { fr: 'Bienvenue sur le portail Everest Secretory.', ar: 'مرحبًا بكم في بوابة إيفرست سيكريتوري.', en: "Welcome back to Everest Secretory portal." },
  total_students: { fr: 'Total Étudiants', ar: 'إجمالي الطلاب', en: 'Total Students' },
  total_teachers: { fr: 'Total Enseignants', ar: 'إجمالي الأساتذة', en: 'Total Teachers' },
  monthly_revenue: { fr: 'Recettes Mensuelles', ar: 'المداخيل الشهرية', en: 'Monthly Revenue' },
  pending_payments: { fr: 'Paiements en Attente', ar: 'دفعات معلقة', en: 'Pending Payments' },
  revenue_growth: { fr: 'Croissance des Recettes', ar: 'نمو المداخيل', en: 'Revenue Growth' },
  real_time_alerts: { fr: 'Alertes en Temps Réel', ar: 'تنبيهات فورية', en: 'Real-time Alerts' },
  view_all: { fr: 'Voir tout', ar: 'عرض الكل', en: 'View all' },

  // Classes Page
  academic_classes: { fr: 'Classes Académiques', ar: 'الأقسام الدراسية', en: 'Academic Classes' },
  manage_rosters: { fr: 'Gérez les listes et les tarifs.', ar: 'إدارة قوائم الأقسام وأسعار الاشتراك.', en: 'Manage class rosters and subscription prices.' },
  create_class: { fr: 'Nouvelle Classe', ar: 'قسم جديد', en: 'New Class' },
  program_selector: { fr: 'Sélecteur de Programme', ar: 'محدد البرنامج', en: 'Program Selector' },
  subscription: { fr: 'Abonnement', ar: 'اشتراك', en: 'Subscription' },
  monthly_price: { fr: 'Prix Mensuel', ar: 'السعر الشهري', en: 'Monthly Price' },
  search_student: { fr: 'Rechercher un étudiant...', ar: 'بحث عن طالب...', en: 'Search student...' },
  student_name: { fr: 'Nom de l\'étudiant', ar: 'اسم الطالب', en: 'Student Name' },
  parent_phone: { fr: 'Tél Parent', ar: 'هاتف الولي', en: 'Parent Phone' },
  status: { fr: 'État', ar: 'الحالة', en: 'Status' },
  print_receipt: { fr: 'Imprimer Reçu', ar: 'طباعة الوصل', en: 'Print Receipt' },
  remove: { fr: 'Supprimer', ar: 'حذف', en: 'Remove' },
  add_student: { fr: 'Ajouter Étudiant', ar: 'إضافة طالب', en: 'Add Student' },
  paid: { fr: 'Payé', ar: 'تم الدفع', en: 'Paid' },
  unpaid: { fr: 'Non Payé', ar: 'لم يتم الدفع', en: 'Unpaid' },
  pending: { fr: 'En attente', ar: 'قيد الانتظار', en: 'Pending' },

  // Teachers Page
  staff_management: { fr: 'Gérez les salaires et affectations.', ar: 'إدارة رواتب الموظفين والمهام.', en: 'Manage staff salaries and assignments.' },
  staff_member: { fr: 'Membre du staff', ar: 'الموظف', en: 'Staff Member' },
  subject: { fr: 'Matière', ar: 'المادة', en: 'Subject' },
  salary: { fr: 'Salaire', ar: 'الراتب', en: 'Salary' },
  pay_salary: { fr: 'Payer Salaire', ar: 'دفع الراتب', en: 'Pay Salary' },
  total_payroll: { fr: 'Masse Salariale', ar: 'كتلة الرواتب', en: 'Total Payroll' },
  batch_pay: { fr: 'Tout Payer', ar: 'دفع الكل', en: 'Batch Pay All' },
  upcoming_exams: { fr: 'Examens à venir', ar: 'الامتحانات القادمة', en: 'Upcoming Exams' },

  // Login
  welcome: { fr: 'Bienvenue à Everest Secretory', ar: 'مرحبًا بكم في إيفرست سيكريتوري', en: 'Welcome to Everest Secretory' },
  login_desc: { fr: 'Entrez vos identifiants pour accéder au portail.', ar: 'أدخل بياناتك للوصول إلى البوابة.', en: 'Enter your credentials to access the portal.' },
  signin: { fr: 'Se Connecter', ar: 'تسجيل الدخول', en: 'Sign In' },
  email: { fr: 'Email', ar: 'البريد الإلكتروني', en: 'Email' },
  password: { fr: 'Mot de passe', ar: 'كلمة المرور', en: 'Password' },
  
  // Misc
  currency: { fr: 'DA', ar: 'د.ج', en: 'DA' },
  cash_payment: { fr: 'Paiement en espèces', ar: 'دفع نقدي', en: 'Cash payment' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('lang') as Language) || 'fr';
  });

  useEffect(() => {
    localStorage.setItem('lang', language);
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string) => {
    if (!translations[key]) return key;
    return translations[key][language];
  };

  const isRTL = language === 'ar';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
