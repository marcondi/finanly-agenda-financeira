
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export enum RecurrenceType {
  NONE = 'NONE',
  MONTHLY = 'MONTHLY',
  ANNUAL = 'ANNUAL'
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  isDefault?: boolean; // Flag para identificar categorias padrão
}

export interface Transaction {
  id: string;
  userId: string;
  description: string;
  amount: number;
  date: string; // ISO format
  type: TransactionType;
  categoryId: string;
  recurrence: RecurrenceType;
  seriesId?: string; // Links recurring instances
}

export interface ScheduledBill {
  id: string;
  userId: string;
  name: string;
  amount: number;
  dueDay: number;
  month?: number | null; // 0-11, null = recorrente
  year?: number | null;  // null = recorrente
  categoryId: string;
  recurrence: RecurrenceType;
  active: boolean;
}

export interface BillPaymentStatus {
  billId: string;
  month: number; // 0-11
  year: number;
  paid: boolean;
  transactionId?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  isGuest?: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}