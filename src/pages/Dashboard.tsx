
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useFinance } from '../hooks/useFinance';
import { useAuth } from '../App';
import { TransactionType, ChatMessage, Transaction, RecurrenceType } from '../types';
import {
  LogoutIcon,
  SunIcon,
  MoonIcon,
  PlusIcon,
  ChevronLeft,
  ChevronRight,
  EditIcon,
  TrashIcon,
  SettingsIcon,
  DownloadIcon
} from '../components/Icons';
import { Modal } from '../components/Modal';
import { TransactionForm } from '../components/TransactionForm';
import { CategoryManager } from '../components/CategoryManager';
import { getAgentResponse } from '../services/geminiService';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { MONTHS } from '../constants';
import JSZip from 'jszip';

/* ---------- helper ---------- */
const saveAs = (blob: Blob, filename: string) => {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};

export function Dashboard() {
  const { user, logout, isDarkMode, toggleDarkMode } = useAuth();
  const finance = useFinance(user?.id);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'overview' | 'agenda'>('overview');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAgentOpen, setIsAgentOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Olá! Sou seu assistente Finanly. Como posso ajudar hoje?' }
  ]);

  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  const filteredTransactions = useMemo(() => {
    if (!finance.transactions) return [];
    return finance.transactions
      .filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === month && d.getFullYear() === year;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [finance.transactions, month, year]);

  const stats = useMemo(() => {
    const income = filteredTransactions
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((acc, t) => acc + t.amount, 0);

    const expense = filteredTransactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((acc, t) => acc + t.amount, 0);

    return { income, expense, balance: income - expense };
  }, [filteredTransactions]);

  /* ======================================================================
     ✅ CORREÇÃO: força TypeScript a aceitar `user` como não-nulo
     ====================================================================== */
  const handleSubmitTransaction = async (data: any, isBill: boolean) => {
    let success = false;

    if (isBill) {
      success = await finance.addScheduledBill(data);
    } else {
      if (editingTransaction) {
        await finance.updateTransaction(editingTransaction.id, data);
        success = true;
      } else {
        success = await finance.addTransaction({
          ...data,
          user_id: user!.id
        });
      }
    }

    if (success) {
      setIsAddModalOpen(false);
      setEditingTransaction(null);
    } else {
      alert(
        'Falha ao salvar a transação.\n\n' +
        'Causa provável: permissões do banco (Row Level Security).'
      );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 min-h-screen">
      <button
        onClick={() => {
          setEditingTransaction(null);
          setIsAddModalOpen(true);
        }}
        className="fixed bottom-10 right-10 w-20 h-20 rounded-3xl bg-indigo-600 text-white shadow-2xl flex items-center justify-center text-4xl"
      >
        <PlusIcon />
      </button>

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingTransaction(null);
        }}
        title={editingTransaction ? 'Editar Registro' : 'Novo Registro'}
      >
        <TransactionForm
          categories={finance.categories}
          initialData={editingTransaction}
          onSubmit={handleSubmitTransaction}
        />
      </Modal>
    </div>
  );
}
