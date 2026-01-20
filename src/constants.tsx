
import React from 'react';
import { Category, Transaction, TransactionType, RecurrenceType } from './types';

export const DEFAULT_CATEGORIES: Category[] = [
  // Expenses
  { id: 'exp-1', name: 'Moradia', type: TransactionType.EXPENSE, icon: '🏠', color: '#f43f5e', isDefault: true },
  { id: 'exp-2', name: 'Alimentação', type: TransactionType.EXPENSE, icon: '🍕', color: '#f97316', isDefault: true },
  { id: 'exp-3', name: 'Transporte', type: TransactionType.EXPENSE, icon: '🚗', color: '#eab308', isDefault: true },
  { id: 'exp-4', name: 'Lazer', type: TransactionType.EXPENSE, icon: '🎉', color: '#a855f7', isDefault: true },
  { id: 'exp-5', name: 'Saúde', type: TransactionType.EXPENSE, icon: '💊', color: '#10b981', isDefault: true },
  { id: 'exp-6', name: 'Educação', type: TransactionType.EXPENSE, icon: '📚', color: '#3b82f6', isDefault: true },
  { id: 'exp-other', name: 'Outros', type: TransactionType.EXPENSE, icon: '📦', color: '#64748b', isDefault: true },
  
  // Incomes
  { id: 'inc-1', name: 'Salário', type: TransactionType.INCOME, icon: '💰', color: '#22c55e', isDefault: true },
  { id: 'inc-2', name: 'Investimentos', type: TransactionType.INCOME, icon: '📈', color: '#06b6d4', isDefault: true },
  { id: 'inc-3', name: 'Freelance', type: TransactionType.INCOME, icon: '💻', color: '#6366f1', isDefault: true },
  { id: 'inc-other', name: 'Outros', type: TransactionType.INCOME, icon: '💵', color: '#14b8a6', isDefault: true },
];

const today = new Date();
const year = today.getFullYear();
const month = today.getMonth();
const getDateInCurrentMonth = (day: number) => new Date(year, month, day).toISOString();

export const DEFAULT_TRANSACTIONS: Transaction[] = [
  { id: 't-inc-1', userId: 'guest_user', description: 'Salário Mensal', amount: 5000, date: getDateInCurrentMonth(5), type: TransactionType.INCOME, categoryId: 'inc-1', recurrence: RecurrenceType.NONE },
  { id: 't-exp-1', userId: 'guest_user', description: 'Aluguel', amount: 1500, date: getDateInCurrentMonth(10), type: TransactionType.EXPENSE, categoryId: 'exp-1', recurrence: RecurrenceType.NONE },
  { id: 't-exp-2', userId: 'guest_user', description: 'Supermercado', amount: 650.75, date: getDateInCurrentMonth(12), type: TransactionType.EXPENSE, categoryId: 'exp-2', recurrence: RecurrenceType.NONE },
  { id: 't-exp-3', userId: 'guest_user', description: 'Conta de Luz', amount: 180.50, date: getDateInCurrentMonth(15), type: TransactionType.EXPENSE, categoryId: 'exp-1', recurrence: RecurrenceType.NONE },
  { id: 't-exp-4', userId: 'guest_user', description: 'Jantar Fora', amount: 120.00, date: getDateInCurrentMonth(18), type: TransactionType.EXPENSE, categoryId: 'exp-4', recurrence: RecurrenceType.NONE },
  { id: 't-inc-2', userId: 'guest_user', description: 'Projeto Freelance', amount: 800, date: getDateInCurrentMonth(20), type: TransactionType.INCOME, categoryId: 'inc-3', recurrence: RecurrenceType.NONE },
];

export const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];