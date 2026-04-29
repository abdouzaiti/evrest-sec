export type PaymentStatus = 'Paid' | 'Unpaid' | 'Pending';

export interface Student {
  id: string;
  name: string;
  parentPhone: string;
  paymentStatus: PaymentStatus;
  classId: string;
}

export interface SchoolClass {
  id: string;
  name: string;
  price: number;
  description: string;
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  subject: string;
  salary: number;
  paymentStatus: PaymentStatus;
  lastPaymentDate?: string;
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
  role: 'admin' | 'director';
}
