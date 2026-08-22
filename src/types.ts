export type PaymentStatus = 'Paid' | 'Unpaid' | 'Pending';

export interface Student {
  id: string;
  name: string;
  parentPhone: string;
  classId: string;
  tokenId?: string;
  currentMonth: number;
  sessionsCompleted: number;
  paymentStatus: PaymentStatus;
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
