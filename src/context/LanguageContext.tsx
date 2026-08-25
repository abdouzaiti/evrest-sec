import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'fr' | 'ar' | 'en';

interface Translations {
  [key: string]: {
    [key in Language]: string;
  };
}

export const translations: Translations = {
  // Sidebar & Navigation
  dashboard: { fr: 'Tableau de bord', ar: 'Tableau de bord', en: 'Dashboard' },
  classes: { fr: 'Classes', ar: 'Classes', en: 'Classes' },
  students: { fr: 'Étudiants', ar: 'Étudiants', en: 'Students' },
  sessions: { fr: 'Séances', ar: 'Séances', en: 'Sessions' },
  teachers: { fr: 'Enseignants', ar: 'Enseignants', en: 'Teachers' },
  payments: { fr: 'Paiements', ar: 'Paiements', en: 'Payments' },
  expenses: { fr: 'Charges & Bilan', ar: 'Charges & Bilan', en: 'Expenses & P&L' },
  notifications: { fr: 'Notifications', ar: 'Notifications', en: 'Notifications' },
  signOut: { fr: 'Déconnexion', ar: 'Déconnexion', en: 'Sign Out' },
  
  // Dashboard
  overview: { fr: 'Aperçu', ar: 'Aperçu', en: 'Overview' },
  welcome_back: { fr: 'Bienvenue sur le portail Everest Secretory.', ar: 'Bienvenue sur le portail Everest Secretory.', en: "Welcome back to Everest Secretory portal." },
  total_students: { fr: 'Total Étudiants', ar: 'Total Étudiants', en: 'Total Students' },
  total_teachers: { fr: 'Total Enseignants', ar: 'Total Enseignants', en: 'Total Teachers' },
  current_month_sessions: { fr: 'Suivi des 4 séances (Mois)', ar: 'Suivi des 4 séances (Mois)', en: '4 Sessions Tracking (Monthly)' },
  manage_students: { fr: 'Gérez les inscriptions et suivis.', ar: 'Gérez les inscriptions et suivis.', en: 'Manage student enrollments and tracking.' },
  monthly_revenue: { fr: 'Recettes Mensuelles', ar: 'Recettes Mensuelles', en: 'Monthly Revenue' },
  pending_payments: { fr: 'Paiements en Attente', ar: 'Paiements en Attente', en: 'Pending Payments' },
  revenue_growth: { fr: 'Croissance des Recettes', ar: 'Croissance des Recettes', en: 'Revenue Growth' },
  real_time_alerts: { fr: 'Alertes en Temps Réel', ar: 'Alertes en Temps Réel', en: 'Real-time Alerts' },
  view_all: { fr: 'Voir tout', ar: 'Voir tout', en: 'View all' },

  // Classes Page
  academic_classes: { fr: 'Classes Académiques', ar: 'Classes Académiques', en: 'Academic Classes' },
  manage_rosters: { fr: 'Gérez les listes et les tarifs.', ar: 'Gérez les listes et les tarifs.', en: 'Manage class rosters and subscription prices.' },
  create_class: { fr: 'Nouvelle Classe', ar: 'Nouvelle Classe', en: 'New Class' },
  program_selector: { fr: 'Sélecteur de Programme', ar: 'Sélecteur de Programme', en: 'Program Selector' },
  subscription: { fr: 'Abonnement', ar: 'Abonnement', en: 'Subscription' },
  monthly_price: { fr: 'Prix Mensuel', ar: 'Prix Mensuel', en: 'Monthly Price' },
  search_student: { fr: 'Rechercher un étudiant...', ar: 'Rechercher un étudiant...', en: 'Search student...' },
  student_name: { fr: 'Nom de l\'étudiant', ar: 'Nom de l\'étudiant', en: 'Student Name' },
  parent_phone: { fr: 'Tél Parent', ar: 'Tél Parent', en: 'Parent Phone' },
  status: { fr: 'État', ar: 'État', en: 'Status' },
  print_receipt: { fr: 'Imprimer Reçu', ar: 'Imprimer Reçu', en: 'Print Receipt' },
  remove: { fr: 'Supprimer', ar: 'Supprimer', en: 'Remove' },
  add_student: { fr: 'Ajouter Étudiant', ar: 'Ajouter Étudiant', en: 'Add Student' },
  paid: { fr: 'Payé', ar: 'Payé', en: 'Paid' },
  unpaid: { fr: 'Non Payé', ar: 'Non Payé', en: 'Unpaid' },
  pending: { fr: 'En attente', ar: 'En attente', en: 'Pending' },

  // Teachers Page
  staff_management: { fr: 'Gérez les salaires et affectations.', ar: 'Gérez les salaires et affectations.', en: 'Manage staff salaries and assignments.' },
  staff_member: { fr: 'Membre du staff', ar: 'Membre du staff', en: 'Staff Member' },
  subject: { fr: 'Matière', ar: 'Matière', en: 'Subject' },
  salary: { fr: 'Salaire', ar: 'Salaire', en: 'Salary' },
  pay_salary: { fr: 'Payer Salaire', ar: 'Payer Salaire', en: 'Pay Salary' },
  payment_month: { fr: 'Mois de paiement', ar: 'Mois de paiement', en: 'Payment Month' },
  total_payroll: { fr: 'Masse Salariale', ar: 'Masse Salariale', en: 'Total Payroll' },
  batch_pay: { fr: 'Tout Payer', ar: 'Tout Payer', en: 'Batch Pay All' },
  upcoming_exams: { fr: 'Examens à venir', ar: 'Examens à venir', en: 'Upcoming Exams' },

  // Login
  welcome: { fr: 'Bienvenue à Everest Secretory', ar: 'Bienvenue à Everest Secretory', en: 'Welcome to Everest Secretory' },
  login_desc: { fr: 'Entrez vos identifiants pour accéder au portail.', ar: 'Entrez vos identifiants pour accéder au portail.', en: 'Enter your credentials to access the portal.' },
  signin: { fr: 'Se Connecter', ar: 'Se Connecter', en: 'Sign In' },
  email: { fr: 'Email', ar: 'Email', en: 'Email' },
  password: { fr: 'Mot de passe', ar: 'Mot de passe', en: 'Password' },
  
  // Misc
  currency: { fr: 'DA', ar: 'DA', en: 'DA' },
  cash_payment: { fr: 'Paiement en espèces', ar: 'Paiement en espèces', en: 'Cash payment' },
  
  // Pointage Terminal
  pointage_terminal: { fr: 'Terminal d\'Entrée', ar: 'Terminal d\'Entrée', en: 'Gate Token Terminal' },
  scan_instruction: { fr: 'Veuillez scanner un jeton (RFID/Simulation)', ar: 'Veuillez scanner un jeton (RFID/Simulation)', en: 'Please scan a token (RFID or Simulation)' },
  pointage_logs: { fr: 'Historique des Pointages', ar: 'Historique des Pointages', en: 'Scans & Attendance Log' },
  assign_token: { fr: 'Associer Jeton', ar: 'Associer Jeton', en: 'Assign Token' },
  token_id: { fr: 'Code Jeton', ar: 'Code Jeton', en: 'Token ID' },
  no_token_assigned: { fr: 'Aucun jeton associé', ar: 'Aucun jeton associé', en: 'No token assigned' },
  student_scan_outcome_paid: { fr: 'Élève en règle - Accès Autorisé ✓', ar: 'Élève en règle - Accès Autorisé ✓', en: 'Student paid - Access authorized ✓' },
  student_scan_outcome_unpaid: { fr: 'Élève non à jour - Accès Bloqué ✗', ar: 'Élève non à jour - Accès Bloqué ✗', en: 'Student unpaid - Access blocked! ✗' },
  teacher_scan_outcome: { fr: 'Présence Enseignante Enregistrée ✓', ar: 'Présence Enseignante Enregistrée ✓', en: 'Teacher clock-in attendance registered ✓' },
  clear_logs: { fr: 'Effacer l\'historique', ar: 'Effacer l\'historique', en: 'Clear logs' },
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
    const saved = localStorage.getItem('lang') as Language;
    return (saved && saved !== 'ar') ? saved : 'fr';
  });

  useEffect(() => {
    localStorage.setItem('lang', language);
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string) => {
    if (!translations[key]) return key;
    return translations[key][language] || translations[key]['fr'];
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
