import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useFinance } from '../hooks/useFinance';
import { useAuth } from '../App';
import { TransactionType, ChatMessage, Transaction, RecurrenceType } from '../types';
import { LogoutIcon, SunIcon, MoonIcon, PlusIcon, ChevronLeft, ChevronRight, EditIcon, TrashIcon, SettingsIcon, DownloadIcon } from '../components/Icons';
import { Modal } from '../components/Modal';
import { TransactionForm } from '../components/TransactionForm';
import { CategoryManager } from '../components/CategoryManager';
import { getAgentResponse } from '../services/geminiService';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { MONTHS } from '../constants';
import JSZip from 'jszip';

// Helper function to save files
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
  const [isReminderVisible, setIsReminderVisible] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([{ 
    role: 'model', 
    text: `Olá! Sou seu assistente Finanly. Como posso ajudar hoje?` 
  }]);

  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  const upcomingBills = useMemo(() => {
    const today = new Date();
    if (currentDate.getMonth() !== today.getMonth() || currentDate.getFullYear() !== today.getFullYear()) {
      return [];
    }
  
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowDay = tomorrow.getDate();
    const tomorrowMonth = tomorrow.getMonth();
    const tomorrowYear = tomorrow.getFullYear();

    return finance.scheduledBills.filter(bill => {
      if (bill.dueDay !== tomorrowDay) return false;
      
      const isRelevantForTomorrow = 
        bill.recurrence === RecurrenceType.MONTHLY || 
        (bill.month === tomorrowMonth && bill.year === tomorrowYear);
      
      if (!isRelevantForTomorrow) return false;

      const isPaid = finance.billStatuses.find(s => 
        s.billId === bill.id && s.month === tomorrowMonth && s.year === tomorrowYear
      )?.paid;

      return !isPaid;
    });
  }, [finance.scheduledBills, finance.billStatuses, currentDate]);

  const filteredTransactions = useMemo(() => {
    if (!finance.transactions) return [];
    return finance.transactions
      .filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === month && d.getFullYear() === year;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [finance.transactions, month, year]);
  
  const filteredScheduledBills = useMemo(() => {
    return finance.scheduledBills.filter(bill => {
      if (bill.recurrence === RecurrenceType.MONTHLY) {
        return true;
      }
      if (bill.month === month && bill.year === year) {
        return true;
      }
      return false;
    });
  }, [finance.scheduledBills, month, year]);

  const stats = useMemo(() => {
    const income = filteredTransactions.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => acc + t.amount, 0);
    const expense = filteredTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => acc + t.amount, 0);
    return { income, expense, balance: income - expense };
  }, [filteredTransactions]);

  const chartData = useMemo(() => {
    const expenses = filteredTransactions.filter(t => t.type === TransactionType.EXPENSE);
    const grouped = expenses.reduce((acc: Record<string, any>, t) => {
      const cat = finance.categories.find(c => c.id === t.categoryId);
      const name = cat?.name?.toUpperCase() || 'OUTROS';
      if (!acc[name]) acc[name] = { name, value: 0, color: cat?.color || '#64748b' };
      acc[name].value += t.amount;
      return acc;
    }, {});
    return Object.values(grouped);
  }, [filteredTransactions, finance.categories]);
  
  const handleDownloadProject = async () => {
    setIsDownloading(true);
    try {
      const zip = new JSZip();

      const filesToZip = {
        // Root files
        'index.html': '../index.html',
        'index.tsx': '../index.tsx',
        'App.tsx': '../App.tsx',
        'types.ts': '../types.ts',
        'constants.tsx': '../constants.tsx',
        'database.sql': '../database.sql',
        'README.md': '../README.md',
        'package.json': '../package.json',
        'vite.config.ts': '../vite.config.ts',
        'tsconfig.json': '../tsconfig.json',
        'tailwind.config.js': '../tailwind.config.js',
        'postcss.config.js': '../postcss.config.js',
        'index.css': '../index.css',
        '.gitignore': '../.gitignore',
        'metadata.json': '../metadata.json',
        'vite-env.d.ts': '../vite-env.d.ts',
        'setup.js': '../setup.js',

        // Subdirectories
        'hooks/useFinance.tsx': '../hooks/useFinance.tsx',
        'lib/supabase.ts': '../lib/supabase.ts',
        'services/geminiService.ts': '../services/geminiService.ts',
        'utils/storage.ts': '../utils/storage.ts',
        'pages/Dashboard.tsx': '../pages/Dashboard.tsx',
        'pages/LoginPage.tsx': '../pages/LoginPage.tsx',
        'components/CategoryManager.tsx': '../components/CategoryManager.tsx',
        'components/Icons.tsx': '../components/Icons.tsx',
        'components/Modal.tsx': '../components/Modal.tsx',
        'components/TransactionForm.tsx': '../components/TransactionForm.tsx',
      };
      
      const fetchPromises = Object.entries(filesToZip).map(([path, url]) =>
        fetch(url)
          .then(res => {
            if (!res.ok) throw new Error(`Network response was not ok for ${url}`);
            return res.text();
          })
          .then(content => ({ path, content }))
      );

      const allFiles = await Promise.all(fetchPromises);

      for (const file of allFiles) {
        zip.file(file.path, file.content);
      }
      
      const blob = await zip.generateAsync({ type: 'blob' });
      saveAs(blob, 'finanly-project.zip');

    } catch (error) {
      console.error("Erro ao criar o zip:", error);
      alert("Ocorreu um erro ao tentar gerar o arquivo .zip do projeto. Verifique o console para mais detalhes.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsAddModalOpen(true);
  };

  const handleTogglePaid = async (bill: any) => {
    const isPaid = finance.billStatuses.find(s => s.billId === bill.id && s.month === month && s.year === year)?.paid;
    
    if (isPaid) {
      await finance.toggleBillPaid(bill.id, month, year);
      alert(`A conta "${bill.name}" foi marcada como NÃO PAGA.\n\nLembre-se de excluir a transação de pagamento correspondente, se necessário.`);
    } else {
      const success = await finance.addTransaction({
        description: `Pagamento: ${bill.name}`,
        amount: bill.amount,
        date: new Date(year, month, bill.dueDay).toISOString(),
        type: TransactionType.EXPENSE,
        categoryId: bill.categoryId,
        recurrence: RecurrenceType.NONE,
      });

      if (success) {
        await finance.toggleBillPaid(bill.id, month, year);
      } else {
        alert(`Falha ao registrar o pagamento da conta.\n\nCausa provável: As permissões do banco de dados (Row Level Security) não estão configuradas corretamente. Por favor, execute o script 'database.sql' no seu painel Supabase.`);
      }
    }
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || isTyping) return;
    const msgText = userInput;
    setChatMessages(prev => [...prev, { role: 'user', text: msgText }]);
    setUserInput('');
    setIsTyping(true);
    try {
      const response = await getAgentResponse(msgText, chatMessages, {
        transactions: finance.transactions,
        categories: finance.categories,
        userName: user?.name || 'Usuário',
        stats
      });
      setChatMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'model', text: 'Erro ao conectar. Tente novamente.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      const { success, message } = await finance.importUserData(content);
      alert(message);
      if (success) {
        setIsSettingsModalOpen(false);
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Limpa o input para permitir o re-upload do mesmo arquivo
  };

  const renderCustomLegend = (props: any) => {
    const { payload } = props;
    const textColor = isDarkMode ? 'text-white' : 'text-slate-600';

    return (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-6">
            {payload.map((entry: any, index: number) => (
                <div key={`item-${index}`} className="flex items-center">
                    <div
                        className="w-2.5 h-2.5 rounded-sm"
                        style={{ backgroundColor: entry.color }}
                    />
                    <span className={`ml-2 text-[10px] font-black uppercase tracking-[0.1em] ${textColor}`}>
                        {entry.value}
                    </span>
                </div>
            ))}
        </div>
    );
  };
  
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/80 backdrop-blur-sm p-4 rounded-2xl border border-white/10 shadow-lg animate-in fade-in zoom-in-95 duration-150">
          <p className="text-xs font-black uppercase tracking-widest text-indigo-400">{payload[0].name}</p>
          <p className="text-white text-lg font-black">
            R$ {payload[0].value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 relative min-h-screen pb-32">
      <header className="flex flex-col lg:flex-row justify-between items-center gap-8 mb-10 bg-[#0f172a]/60 dark:bg-slate-900/60 p-6 rounded-[3rem] border border-white/5 backdrop-blur-3xl shadow-2xl">
        <div className="flex items-center gap-5 w-full lg:w-auto">
          <div className="w-16 h-16 bg-indigo-600 rounded-[1.8rem] flex items-center justify-center text-4xl shadow-2xl text-white font-bold transform -rotate-6">F</div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">Finanly.</h1>
            <p className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.2em]">Dashboard de {user?.name?.toUpperCase()}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-8 bg-black/40 px-8 py-3 rounded-2xl border border-white/5">
          <button onClick={() => setCurrentDate(new Date(year, month - 1))} className="p-2 text-slate-400 hover:text-indigo-400"><ChevronLeft /></button>
          <div className="flex flex-col items-center min-w-[120px]">
            <span className="text-sm font-black text-white uppercase tracking-[0.3em]">{MONTHS[month]}</span>
            <span className="text-[10px] font-black text-indigo-500/80">{year}</span>
          </div>
          <button onClick={() => setCurrentDate(new Date(year, month + 1))} className="p-2 text-slate-400 hover:text-indigo-400"><ChevronRight /></button>
        </div>

        <div className="flex items-center gap-4 w-full lg:w-auto justify-center">
          <button onClick={() => setIsCategoryModalOpen(true)} className="px-6 py-4 bg-slate-800/80 text-slate-300 rounded-2xl border border-white/5 font-black text-[10px] uppercase tracking-widest">
            CATEGORIAS
          </button>
          <button onClick={() => setIsSettingsModalOpen(true)} className="p-4 bg-slate-800/80 text-slate-300 rounded-2xl border border-white/5">
            <SettingsIcon />
          </button>
          <button onClick={toggleDarkMode} className="p-4 bg-slate-800/80 text-slate-300 rounded-2xl border border-white/5">
            {isDarkMode ? <SunIcon /> : <MoonIcon />}
          </button>
          <button onClick={logout} className="p-4 bg-rose-500/10 text-rose-500 rounded-2xl border border-rose-500/20">
            <LogoutIcon />
          </button>
        </div>
      </header>
      
      {upcomingBills.length > 0 && isReminderVisible && (
        <div className="relative flex items-start sm:items-center justify-between gap-4 p-6 mb-8 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-[2rem] shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-4">
            <div className="text-2xl pt-1 sm:pt-0">💡</div>
            <div>
              <h4 className="font-black text-sm text-white">Lembrete de Agendamento</h4>
              <p className="text-xs font-bold mt-1">
                Você tem {upcomingBills.length} conta{upcomingBills.length > 1 ? 's' : ''} vencendo amanhã: {upcomingBills.map(b => b.name).join(', ')}.
              </p>
            </div>
          </div>
          <button onClick={() => setIsReminderVisible(false)} className="absolute top-4 right-4 text-indigo-400 hover:text-white transition-colors">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
      )}


      {/* BANNER DE RESUMO */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <div className="bg-indigo-600 p-8 rounded-[2.5rem] shadow-2xl flex flex-col justify-center items-center text-center">
          <p className="text-[10px] font-black uppercase text-white/60 tracking-[0.3em] mb-2">Resumo de</p>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">{MONTHS[month]}</h2>
        </div>
        <div className="bg-[#0f172a] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] mb-3">Entradas</p>
          <h2 className="text-3xl font-black text-emerald-500 tracking-tighter">R$ {stats.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
        </div>
        <div className="bg-[#0f172a] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] mb-3">Saídas</p>
          <h2 className="text-3xl font-black text-rose-500 tracking-tighter">R$ {stats.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
        </div>
        <div className="bg-[#0f172a] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] mb-3">Balanço</p>
          <h2 className={`text-3xl font-black tracking-tighter ${stats.balance >= 0 ? 'text-white' : 'text-rose-400'}`}>R$ {stats.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-7 space-y-8">
          <div className="flex items-center justify-between mb-2 px-2">
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-[0.3em]">Atividades</h3>
            <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5">
               <button onClick={() => setActiveTab('overview')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'overview' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Fluxo</button>
               <button onClick={() => setActiveTab('agenda')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'agenda' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Agenda</button>
            </div>
          </div>

          <div className="space-y-4">
            {activeTab === 'overview' ? (
              filteredTransactions.map(t => {
                const cat = finance.categories.find(c => c.id === t.categoryId);
                return (
                  <div key={t.id} className="p-6 bg-[#0f172a] rounded-[2.5rem] border border-white/5 flex items-center justify-between shadow-xl group hover:border-indigo-500/30 transition-all">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-black/40 rounded-3xl flex items-center justify-center text-3xl">{cat?.icon || '📦'}</div>
                      <div>
                        <h4 className="font-black text-white text-sm uppercase tracking-tight">{t.description}</h4>
                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">{cat?.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <span className={`text-lg font-black ${t.type === TransactionType.INCOME ? 'text-emerald-500' : 'text-rose-500'}`}>R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(t)} className="p-3 bg-slate-800 text-indigo-400 rounded-xl hover:bg-indigo-500 hover:text-white transition-all"><EditIcon /></button>
                        <button onClick={() => finance.deleteTransaction(t.id)} className="p-3 bg-slate-800 text-rose-400 rounded-xl hover:bg-rose-500 hover:text-white transition-all"><TrashIcon /></button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              filteredScheduledBills.map(bill => {
                const isPaid = finance.billStatuses.find(s => s.billId === bill.id && s.month === month && s.year === year)?.paid;
                const cat = finance.categories.find(c => c.id === bill.categoryId);
                return (
                  <div key={bill.id} className={`p-6 rounded-[2.5rem] border transition-all flex items-center justify-between shadow-xl ${isPaid ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-[#0f172a] border-white/5'}`}>
                    <div className="flex items-center gap-6">
                      <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-3xl ${isPaid ? 'bg-emerald-500/20' : 'bg-black/40'}`}>{cat?.icon || '📅'}</div>
                      <div>
                        <h4 className={`font-black text-sm uppercase tracking-tight ${isPaid ? 'text-emerald-500 line-through opacity-60' : 'text-white'}`}>{bill.name}</h4>
                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">Vence dia {bill.dueDay}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <span className="text-lg font-black text-white">R$ {bill.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      <button onClick={() => handleTogglePaid(bill)} className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${isPaid ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:bg-indigo-600 hover:text-white'}`}>
                        {isPaid ? 'PAGO' : 'PAGAR'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="lg:col-span-5">
           <div className="bg-[#0f172a] p-10 rounded-[4rem] border border-white/5 shadow-2xl sticky top-12">
              <h3 className="text-[11px] font-black uppercase text-slate-400 tracking-[0.4em] text-center mb-10">Gasto por Categoria</h3>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={80} outerRadius={115} paddingAngle={8} dataKey="value" stroke="none">
                      {chartData.map((entry: any, index: number) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                    <Legend content={renderCustomLegend} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
           </div>
        </div>
      </div>

      <div className="fixed bottom-10 right-10 flex flex-col items-end gap-5 z-50">
        <button onClick={() => setIsAgentOpen(!isAgentOpen)} className="w-16 h-16 rounded-2xl bg-[#0f172a] shadow-2xl flex items-center justify-center text-3xl hover:rotate-12 transition-all border-4 border-[#020617]">🤖</button>
        <button onClick={() => { setEditingTransaction(null); setIsAddModalOpen(true); }} className="w-20 h-20 rounded-3xl bg-indigo-600 text-white shadow-2xl flex items-center justify-center text-4xl hover:scale-110 transition-all border-6 border-[#020617]">
          <PlusIcon className="w-10 h-10" />
        </button>
      </div>

      <Modal isOpen={isAddModalOpen} onClose={() => { setIsAddModalOpen(false); setEditingTransaction(null); }} title={editingTransaction ? "Editar Registro" : "Novo Registro"}>
        <TransactionForm 
          categories={finance.categories} 
          initialData={editingTransaction}
          onSubmit={async (data, isBill) => {
            let success = false;
            if (isBill) {
              let billData = { ...data };
              if (data.recurrence !== RecurrenceType.MONTHLY) {
                billData = { ...billData, month, year };
              }
              success = await finance.addScheduledBill(billData);
            } else {
              if (editingTransaction) {
                await finance.updateTransaction(editingTransaction.id, data);
                success = true; // Assume success for updates to keep it simple
              } else {
                success = await finance.addTransaction(data);
              }
            }

            if (success) {
              setIsAddModalOpen(false);
              setEditingTransaction(null);
            } else {
              const entity = isBill ? 'agendamento' : 'transação';
              alert(`Falha ao salvar o ${entity}.\n\nCausa provável: As permissões do banco de dados (Row Level Security) não estão configuradas corretamente.\n\nPor favor, execute o script do arquivo 'database.sql' no Editor de SQL do seu painel Supabase para corrigir.`);
            }
          }} 
        />
      </Modal>

      <Modal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} title="Categorias">
        <CategoryManager categories={finance.categories} onAdd={finance.addCategory} onDelete={finance.deleteCategory} />
      </Modal>

      <Modal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} title="Configurações e Dados">
        <div className="space-y-8">
            <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800/60">
                <h4 className="font-bold text-white text-sm mb-2">Backup Total do Projeto (.zip)</h4>
                <p className="text-xs text-slate-400 mb-4">
                    Crie um backup completo de todos os arquivos do aplicativo (código-fonte) em um arquivo .zip. Este é o método recomendado para salvar uma versão funcional do projeto que você pode rodar localmente ou publicar.
                </p>
                <button
                    onClick={handleDownloadProject}
                    disabled={isDownloading}
                    className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold text-[10px] uppercase tracking-widest rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                >
                    <DownloadIcon className="w-4 h-4" />
                    {isDownloading ? 'Gerando .zip...' : 'Fazer Backup do Projeto'}
                </button>
            </div>
            
            <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800/60">
                <h4 className="font-bold text-white text-sm mb-2">Exportar Dados (Backup)</h4>
                <p className="text-xs text-slate-400 mb-4">
                    Salve todos os seus dados (transações, categorias, agendamentos) em um arquivo JSON. Isso é útil para segurança ou para migrar seus dados.
                </p>
                <button
                    onClick={finance.exportUserData}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] uppercase tracking-widest rounded-lg transition-all"
                >
                    Fazer Backup de Dados
                </button>
            </div>

            <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800/60">
                <h4 className="font-bold text-white text-sm mb-2">Importar Dados (Restaurar)</h4>
                <p className="text-xs text-slate-400 mb-4">
                    Selecione um arquivo de backup (.json) para restaurar seus dados. ATENÇÃO: Isso substituirá todos os dados existentes para este usuário.
                </p>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold text-[10px] uppercase tracking-widest rounded-lg transition-all"
                >
                    Restaurar Backup de Dados
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileImport}
                    className="hidden"
                    accept=".json"
                />
            </div>
        </div>
      </Modal>

      {isAgentOpen && (
        <div className="fixed bottom-40 right-10 w-[90vw] max-w-[400px] h-[600px] bg-[#020617] rounded-[3rem] shadow-2xl border border-white/10 flex flex-col z-50">
           <div className="p-6 bg-slate-900 flex items-center justify-between border-b border-white/5 rounded-t-[3rem]">
             <h4 className="font-black text-[10px] tracking-[0.2em] uppercase text-white">Finanly AI</h4>
             <button onClick={() => setIsAgentOpen(false)} className="text-slate-400 hover:text-white">✕</button>
           </div>
           <div className="flex-1 overflow-y-auto p-6 space-y-4">
             {chatMessages.map((m, i) => (
               <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                 <div className={`max-w-[85%] p-5 rounded-[1.8rem] text-[12px] font-bold ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-100'}`}>{m.text}</div>
               </div>
             ))}
             {isTyping && <div className="text-indigo-400 font-black text-[10px] uppercase">IA pensando...</div>}
             <div ref={chatEndRef} />
           </div>
           <div className="p-5 bg-slate-900 border-t border-white/5 flex gap-3 rounded-b-[3rem]">
             <input type="text" value={userInput} onChange={e => setUserInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} placeholder="Pergunte..." className="flex-1 px-6 py-4 rounded-2xl bg-black/40 text-[10px] font-black text-white" />
             <button onClick={handleSendMessage} disabled={isTyping} className="p-4 bg-indigo-600 text-white rounded-xl">🚀</button>
           </div>
        </div>
      )}
    </div>
  );
}