export interface RentVaultDeposit {
  id: string;
  amount: number;
  date: string;
  month: number;
  year: number;
  note?: string;
}

export interface RentVaultConfig {
  targetAnnualRent: number;
  deposits: RentVaultDeposit[];
}

export type ExpenseCategory = 'rent' | 'utilities' | 'salaries' | 'supplies' | 'maintenance' | 'marketing' | 'taxes' | 'other';

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  month: number;
  year: number;
  notes?: string;
}

export type PaymentStatus = 'Paid' | 'Unpaid' | 'Pending';

export interface Student {
  id: string;
  name: string;
  parentPhone: string;
  classId: string;
  classIds?: string[];
  tokenId?: string;
  currentMonth: number;
  paidMonths: number[];
  sessionsCompleted: number;
  paymentStatus: PaymentStatus;
  attendance?: Record<number, boolean[]>;
  attendanceDates?: Record<number, string[]>;
}

export interface SchoolClass {
  id: string;
  name: string;
  price: number;
  description: string;
  teacherId?: string;
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  subject: string;
  salary: number;
  paymentStatus: PaymentStatus;
  lastPaymentDate?: string;
  tokenId?: string;
  currentMonth?: number;
  paidMonths?: number[];
}

export interface PointageLog {
  id: string;
  personId: string;
  personType: 'student' | 'teacher';
  personName: string;
  tokenId: string;
  timestamp: string;
  details: string;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  session_date: string; // ISO String
  is_present: boolean;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'danger' | 'success';
  timestamp: string;
  read: boolean;
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: 'director' | 'secretary';
}

export interface TimetableCell {
  id: string;
  day: string; // 'Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'
  timeSlot: string; // e.g. '08:00 - 10:00'
  classId?: string;
  className?: string;
  teacherId?: string;
  teacherName?: string;
  room?: string;
  subject?: string;
  color?: string;
  note?: string;
}

export interface TimetableConfig {
  days: string[];
  timeSlots: string[];
  cells: Record<string, TimetableCell>; // key: `${day}_${timeSlot}`
  rooms: string[];
}

export interface PaymentRecord {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  month: number;
  amountPaid: number;
  sarf: number; // Change
  sessionDates: string[]; // Timestamps of sessions
  timestamp: string;
}
