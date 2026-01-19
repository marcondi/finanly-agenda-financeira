
import React from 'react';
import { TransactionType, Category, RecurrenceType } from '../types';

interface TransactionFormProps {
  categories: Category[];
  onSubmit: (data: any, isBill: boolean) => void;
  initialData?: any; // Assumed to be a transaction for editing
}

export function TransactionForm({ categories, onSubmit, initialData }: TransactionFormProps) {
  const [formMode, setFormMode] = React.useState<'TRANSACTION' | 'SCHEDULE'>(initialData ? 'TRANSACTION' : 'TRANSACTION');
  const [transactionType, setTransactionType] = React.useState<'EXPENSE' | 'INCOME'>(initialData?.type || 'EXPENSE');
  const [isRecurring, setIsRecurring] = React.useState(initialData?.recurrence === RecurrenceType.MONTHLY || false);

  const [formData, setFormData] = React.useState({
    description: initialData?.description || '',
    amount: initialData?.amount || '',
    date: initialData?.date?.split('T')[0] || new Date().toISOString().split('T')[0],
    categoryId: initialData?.categoryId || '',
    dueDay: ''
  });

  const handleModeChange = (mode: 'TRANSACTION' | 'SCHEDULE', type?: 'EXPENSE' | 'INCOME') => {
    if (initialData) return;
    
    setFormMode(mode);
    if (type) setTransactionType(type);
    setIsRecurring(false); // Reset recurrence on mode change

    setFormData({
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      categoryId: '',
      dueDay: ''
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.categoryId) return;

    if (formMode === 'SCHEDULE') {
      onSubmit({ 
        name: formData.description,
        amount: parseFloat(formData.amount.toString()),
        dueDay: parseInt(formData.dueDay),
        categoryId: formData.categoryId,
        recurrence: isRecurring ? RecurrenceType.MONTHLY : RecurrenceType.NONE,
        active: true
      }, true);
    } else {
      onSubmit({
        description: formData.description,
        amount: parseFloat(formData.amount.toString()),
        date: formData.date,
        categoryId: formData.categoryId,
        type: transactionType,
        recurrence: isRecurring ? RecurrenceType.MONTHLY : RecurrenceType.NONE,
      }, false);
    }
  };

  const currentCategoryType = formMode === 'SCHEDULE' ? TransactionType.EXPENSE : transactionType;
  const filteredCategories = categories.filter(c => c.type === currentCategoryType);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex gap-2 p-1.5 bg-[#0f172a] rounded-2xl border border-slate-800/40">
        <button 
          type="button" 
          onClick={() => handleModeChange('TRANSACTION', 'EXPENSE')} 
          disabled={!!initialData}
          className={`flex-1 py-4 rounded-xl text-[11px] font-[900] uppercase tracking-[0.15em] transition-all duration-200 ${
            formMode === 'TRANSACTION' && transactionType === 'EXPENSE' 
            ? 'bg-[#1e293b] text-[#f43f5e] border border-[#f43f5e]/30 shadow-inner' 
            : 'text-slate-500 hover:text-slate-400 disabled:opacity-50'
          }`}
        >
          Despesa
        </button>
        <button 
          type="button" 
          onClick={() => handleModeChange('TRANSACTION', 'INCOME')} 
          disabled={!!initialData}
          className={`flex-1 py-4 rounded-xl text-[11px] font-[900] uppercase tracking-[0.15em] transition-all duration-200 ${
            formMode === 'TRANSACTION' && transactionType === 'INCOME' 
            ? 'bg-[#1e293b] text-emerald-500 border border-emerald-500/30 shadow-inner' 
            : 'text-slate-500 hover:text-slate-400 disabled:opacity-50'
          }`}
        >
          Receita
        </button>
        <button 
          type="button" 
          onClick={() => handleModeChange('SCHEDULE')} 
          disabled={!!initialData}
          className={`flex-1 py-4 rounded-xl text-[11px] font-[900] uppercase tracking-[0.15em] transition-all duration-200 ${
            formMode === 'SCHEDULE'
            ? 'bg-[#1e293b] text-indigo-400 border border-indigo-400/30 shadow-inner' 
            : 'text-slate-500 hover:text-slate-400 disabled:opacity-50'
          }`}
        >
          Agendamento
        </button>
      </div>

      <div className="space-y-4">
        <input 
          required 
          type="text" 
          placeholder="DESCRIÇÃO" 
          value={formData.description} 
          onChange={e => setFormData({ ...formData, description: e.target.value })} 
          className="w-full p-6 rounded-2xl border border-transparent bg-[#0f172a] text-white font-bold text-[12px] tracking-widest placeholder:text-slate-600 uppercase outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" 
        />
        <input 
          required 
          type="number" 
          step="0.01"
          placeholder="VALOR" 
          value={formData.amount} 
          onChange={e => setFormData({ ...formData, amount: e.target.value })} 
          className="w-full p-6 rounded-2xl border border-transparent bg-[#0f172a] text-white font-bold text-[12px] tracking-widest placeholder:text-slate-600 uppercase outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" 
        />
        
        {formMode === 'TRANSACTION' && (
          <input 
            required
            type="date"
            value={formData.date}
            onChange={e => setFormData({ ...formData, date: e.target.value })} 
            className="w-full p-6 rounded-2xl border border-transparent bg-[#0f172a] text-white font-bold text-[12px] tracking-widest uppercase outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
        )}

        {formMode === 'SCHEDULE' && (
           <input 
            required 
            type="number" 
            min="1" max="31"
            placeholder="DIA DO VENCIMENTO" 
            value={formData.dueDay} 
            onChange={e => setFormData({ ...formData, dueDay: e.target.value })} 
            className="w-full p-6 rounded-2xl border border-transparent bg-[#0f172a] text-white font-bold text-[12px] tracking-widest placeholder:text-slate-600 uppercase outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" 
          />
        )}

        <div className="relative">
          <select 
            required
            value={formData.categoryId} 
            onChange={e => setFormData({ ...formData, categoryId: e.target.value })} 
            className="w-full p-6 rounded-2xl border border-transparent bg-[#0f172a] text-white font-bold text-[12px] tracking-widest uppercase outline-none appearance-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
          >
            <option value="" className="bg-[#0f172a] text-slate-600">SELECIONE CATEGORIA</option>
            {filteredCategories.map(c => (
              <option key={c.id} value={c.id} className="bg-[#0f172a]">{c.icon} {c.name.toUpperCase()}</option>
            ))}
          </select>
          <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path>
            </svg>
          </div>
        </div>
      </div>

      {(formMode === 'TRANSACTION' || formMode === 'SCHEDULE') && (
        <div className="flex items-center gap-3 py-2 px-4 bg-[#0f172a] rounded-2xl cursor-pointer" onClick={() => setIsRecurring(!isRecurring)}>
          <input
            type="checkbox"
            id="recurring"
            checked={isRecurring}
            onChange={e => setIsRecurring(e.target.checked)}
            className="w-5 h-5 rounded-md border-2 border-slate-700 bg-slate-800 text-indigo-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
          />
          <label htmlFor="recurring" className="text-slate-300 text-[10px] font-black uppercase tracking-widest select-none cursor-pointer">
            {formMode === 'SCHEDULE' ? 'Agendamento Mensal Recorrente' : 'Repetir mensalmente por 1 ano'}
          </label>
        </div>
      )}

      <button 
        type="submit" 
        className="w-full py-6 bg-[#5c50ee] hover:bg-[#4f46e5] text-white font-[900] rounded-2xl shadow-xl shadow-indigo-600/20 transition-all active:scale-[0.98] uppercase tracking-[0.3em] text-[12px] mt-4"
      >
        SALVAR
      </button>
    </form>
  );
}