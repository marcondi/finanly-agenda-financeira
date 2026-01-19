
import React, { useState } from 'react';
import { Category, TransactionType } from '../types';
import { TrashIcon, PlusIcon, LockIcon } from './Icons';

interface CategoryManagerProps {
  categories: Category[];
  onAdd: (cat: any) => Promise<boolean>;
  onDelete: (id: string) => void;
}

export function CategoryManager({ categories, onAdd, onDelete }: CategoryManagerProps) {
  const [newExpenseName, setNewExpenseName] = useState('');
  const [newIncomeName, setNewIncomeName] = useState('');
  const [showAddFormForExpense, setShowAddFormForExpense] = useState(false);
  const [showAddFormForIncome, setShowAddFormForIncome] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState<TransactionType | null>(null);

  const handleAdd = async (type: TransactionType) => {
    const name = type === TransactionType.EXPENSE ? newExpenseName : newIncomeName;
    if (!name.trim()) return;

    const newCategoryData = {
      name,
      type,
      icon: type === TransactionType.EXPENSE ? '🏷️' : '💡',
      color: type === TransactionType.EXPENSE ? '#8b5cf6' : '#14b8a6'
    };
    
    setIsSubmitting(type);
    const success = await onAdd(newCategoryData);
    if (success) {
      if (type === TransactionType.EXPENSE) {
        setNewExpenseName('');
        setShowAddFormForExpense(false);
      } else {
        setNewIncomeName('');
        setShowAddFormForIncome(false);
      }
    } else {
      alert('Falha ao adicionar categoria.\n\nCausa provável: As permissões do banco de dados (Row Level Security) não estão configuradas corretamente.\n\nPor favor, execute o script do arquivo `database.sql` no Editor de SQL do seu painel Supabase para corrigir.');
    }
    setIsSubmitting(null);
  };

  const expenseCategories = categories.filter(c => c.type === TransactionType.EXPENSE);
  const incomeCategories = categories.filter(c => c.type === TransactionType.INCOME);

  const renderCategoryItem = (c: Category) => (
    <div key={c.id} className="p-4 bg-slate-900 rounded-xl flex justify-between items-center border border-slate-800/60">
      <span className="text-white font-bold text-xs">{c.icon} {c.name.toUpperCase()}</span>
      {c.isDefault ? (
        <span className="text-slate-600 cursor-help" title="Categorias padrão não podem ser excluídas.">
          <LockIcon className="w-4 h-4" />
        </span>
      ) : (
        <button 
          onClick={() => {
            if (window.confirm(`Tem certeza que deseja excluir a categoria "${c.name}"? As transações existentes que usam esta categoria não serão apagadas, mas ficarão sem categoria.`)) {
              onDelete(c.id);
            }
          }}
          className="text-slate-400 hover:text-rose-500 transition-all"
          aria-label={`Excluir categoria ${c.name}`}
        >
          <TrashIcon />
        </button>
      )}
    </div>
  );
  
  const renderAddForm = (type: TransactionType) => {
    const isExpense = type === TransactionType.EXPENSE;
    const name = isExpense ? newExpenseName : newIncomeName;
    const setName = isExpense ? setNewExpenseName : setNewIncomeName;
    const setShow = isExpense ? setShowAddFormForExpense : setShowAddFormForIncome;
    const submitting = isSubmitting === type;

    return (
        <div className="p-2 bg-[#0f172a] rounded-xl border border-indigo-500/30 animate-in fade-in duration-200">
            <input 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder={isExpense ? "Nome da Despesa" : "Nome da Receita"} 
                autoFocus
                disabled={submitting}
                className="w-full mb-2 px-4 py-3 rounded-lg bg-slate-800 text-white font-bold text-[11px] tracking-widest placeholder:text-slate-500 uppercase outline-none focus:ring-1 focus:ring-indigo-500/50"
            />
            <div className="flex gap-2">
                <button onClick={() => setShow(false)} className="flex-1 py-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:bg-slate-800/50 rounded-md">Cancelar</button>
                <button onClick={() => handleAdd(type)} disabled={submitting} className="flex-1 py-2 bg-indigo-600 text-white font-bold text-[10px] uppercase tracking-widest rounded-md hover:bg-indigo-500 disabled:opacity-50">
                    {submitting ? 'Salvando...' : 'Salvar'}
                </button>
            </div>
        </div>
    );
  };

  const renderAddButton = (type: TransactionType) => {
      const isExpense = type === TransactionType.EXPENSE;
      const setShow = isExpense ? setShowAddFormForExpense : setShowAddFormForIncome;
      return (
        <button onClick={() => setShow(true)} className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-700/60 hover:border-indigo-500/60 hover:bg-indigo-500/10 text-slate-500 hover:text-indigo-400 rounded-xl transition-all">
            <PlusIcon className="w-4 h-4" />
            <span className="font-black text-[10px] uppercase tracking-widest">{isExpense ? 'Adicionar Despesa' : 'Adicionar Receita'}</span>
        </button>
      );
  };

  return (
    <div className="space-y-6">
      <div className="max-h-[60vh] overflow-y-auto pr-3 -mr-3 pt-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          
          {/* COLUNA DE DESPESAS */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] px-2 mb-3">Despesas</h4>
            {expenseCategories.map(renderCategoryItem)}
            <div className="pt-2">
                {showAddFormForExpense ? renderAddForm(TransactionType.EXPENSE) : renderAddButton(TransactionType.EXPENSE)}
            </div>
          </div>

          {/* COLUNA DE RECEITAS */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] px-2 mb-3">Receitas</h4>
            {incomeCategories.map(renderCategoryItem)}
            <div className="pt-2">
                {showAddFormForIncome ? renderAddForm(TransactionType.INCOME) : renderAddButton(TransactionType.INCOME)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}