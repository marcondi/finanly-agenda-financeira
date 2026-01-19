import { useState, useEffect } from 'react';
import { Transaction, Category, ScheduledBill, BillPaymentStatus, TransactionType, RecurrenceType } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { DEFAULT_CATEGORIES, DEFAULT_TRANSACTIONS } from '../constants';
import { storage } from '../utils/storage';

export const useFinance = (userId: string | undefined) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [scheduledBills, setScheduledBills] = useState<ScheduledBill[]>([]);
  const [billStatuses, setBillStatuses] = useState<BillPaymentStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const isGuest = userId === 'guest_user' || !isSupabaseConfigured;

  const mapFromDB = (data: any) => {
    if (!data) return data;
    const mapped: any = { ...data };
    if (data.user_id) mapped.userId = data.user_id;
    if (data.category_id) mapped.categoryId = data.category_id;
    if (data.due_day !== undefined) mapped.dueDay = data.due_day;
    if (data.bill_id) mapped.billId = data.bill_id;
    if (data.series_id) mapped.seriesId = data.series_id;
    if (data.is_default !== undefined) mapped.isDefault = data.is_default;
    return mapped;
  };

  const mapToDB = (data: any) => {
    if (!data) return data;
    const mapped: any = { ...data };
    if (data.userId) mapped.user_id = data.userId;
    if (data.categoryId) mapped.category_id = data.categoryId;
    if (data.dueDay !== undefined) mapped.due_day = data.dueDay;
    if (data.billId) mapped.bill_id = data.billId;
    if (data.seriesId) mapped.series_id = data.seriesId;
    if (data.isDefault !== undefined) mapped.is_default = data.isDefault;
    delete mapped.userId;
    delete mapped.categoryId;
    delete mapped.dueDay;
    delete mapped.billId;
    delete mapped.seriesId;
    delete mapped.isDefault;
    return mapped;
  };

  useEffect(() => {
    if (!userId) return;
    const fetchData = async () => {
      setLoading(true);
      if (isGuest) {
        setTransactions(storage.get('transactions', userId, DEFAULT_TRANSACTIONS));
        setCategories(storage.get('categories', userId, DEFAULT_CATEGORIES));
        setScheduledBills(storage.get('bills', userId, []));
        setBillStatuses(storage.get('statuses', userId, []));
        setLoading(false);
        return;
      }
      try {
        const { data: cats, error: catError } = await supabase.from('categories').select('*').eq('user_id', userId);
        if (catError) throw catError;

        if (cats && cats.length > 0) {
          setCategories(cats.map(mapFromDB));
        } else {
          const defaultsWithUser = DEFAULT_CATEGORIES.map((c: Category) => ({ 
            ...c, 
            id: undefined, 
            user_id: userId,
            is_default: true
          }));
          const { data: newCats, error: insertError } = await supabase.from('categories').insert(defaultsWithUser).select();
          if (insertError) throw insertError;
          if (newCats) setCategories(newCats.map(mapFromDB));
        }

        const { data: trans } = await supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false });
        if (trans) setTransactions(trans.map(mapFromDB));

        const { data: bills } = await supabase.from('scheduled_bills').select('*').eq('user_id', userId);
        if (bills) setScheduledBills(bills.map(mapFromDB));

        const { data: st } = await supabase.from('bill_statuses').select('*').eq('user_id', userId);
        if (st) setBillStatuses(st.map(mapFromDB));

      } catch (err) {
        console.error("Erro Crítico ao buscar dados:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId, isGuest]);

  const generateRecurringTransactions = (baseTransaction: any, count: number = 12) => {
    const seriesId = baseTransaction.seriesId || `series_${Date.now()}`;
    const items: Transaction[] = [];
    const baseDate = new Date(baseTransaction.date);
    
    for (let i = 0; i < count; i++) {
      const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1, 12, 0, 0);
      const lastDayOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(baseDate.getDate(), lastDayOfMonth));
      
      const installmentNumber = i + 1;

      items.push({
        ...baseTransaction,
        id: `tr_${Date.now()}_${i}`,
        date: d.toISOString(),
        seriesId,
        description: count > 1 ? `${baseTransaction.description.split(' (')[0]} (${installmentNumber}/${count})` : baseTransaction.description
      });
    }
    return items;
  };

  const addTransaction = async (t: any): Promise<boolean> => {
    let newItems: Transaction[] = [];
    if (t.recurrence === RecurrenceType.MONTHLY) {
      newItems = generateRecurringTransactions({ ...t, userId: userId! });
    } else {
      newItems = [{ ...t, id: `tr_${Date.now()}`, userId: userId! }];
    }

    if (isGuest) {
      const updated = [...newItems, ...transactions];
      setTransactions(updated.sort((a, b) => b.date.localeCompare(a.date)));
      storage.set('transactions', userId!, updated);
      return true;
    } else {
      const dbItems = newItems.map(item => {
        const mapped = mapToDB(item);
        delete mapped.id; // Deixar o DB gerar o UUID
        return mapped;
      });
      const { data: added, error } = await supabase.from('transactions').insert(dbItems).select();
      
      if (error || !added || added.length === 0) {
        console.error("Erro ao salvar transação (verifique RLS):", error);
        return false;
      }
      setTransactions(prev => [...added.map(mapFromDB), ...prev].sort((a, b) => b.date.localeCompare(a.date)));
      return true;
    }
  };

  const updateTransaction = async (id: string, updates: any) => {
    const original = transactions.find(t => t.id === id);
    if (!original) return;

    let updatedTransactions: Transaction[] = [];

    if (original.seriesId && updates.recurrence === RecurrenceType.MONTHLY) {
        const baseDescription = original.description.split(' (')[0];
        const newBase = { ...original, ...updates, description: baseDescription };
        const newSeries = generateRecurringTransactions(newBase);
        updatedTransactions = [...transactions.filter(t => t.seriesId !== original.seriesId), ...newSeries];
        if (!isGuest) {
            await supabase.from('transactions').delete().eq('series_id', original.seriesId);
            await supabase.from('transactions').insert(newSeries.map(mapToDB));
        }
    } 
    else if (updates.recurrence === RecurrenceType.MONTHLY && original.recurrence !== RecurrenceType.MONTHLY) {
      const newSeries = generateRecurringTransactions({ ...original, ...updates });
      updatedTransactions = [...transactions.filter(t => t.id !== id), ...newSeries];
      if (!isGuest) {
        await supabase.from('transactions').delete().eq('id', id);
        await supabase.from('transactions').insert(newSeries.map(mapToDB));
      }
    }
    else {
      updatedTransactions = transactions.map(t => t.id === id ? { ...t, ...updates } : t);
      if (!isGuest) await supabase.from('transactions').update(mapToDB(updates)).eq('id', id);
    }
    
    setTransactions(updatedTransactions.sort((a, b) => b.date.localeCompare(a.date)));
    if (isGuest) storage.set('transactions', userId!, updatedTransactions);
  };

  const addScheduledBill = async (bill: any): Promise<boolean> => {
    if (!userId) {
      console.error("Tentativa de adicionar agendamento sem ID de usuário.");
      return false;
    }

    if (isGuest) {
      const newBill = { ...bill, id: `bill_${Date.now()}`, userId };
      const updatedBills = [...scheduledBills, newBill];
      setScheduledBills(updatedBills);
      storage.set('bills', userId, updatedBills);
      return true;
    }

    const billToInsert = mapToDB({ ...bill, userId, isDefault: false });
    delete billToInsert.id;

    const { data: newBillsFromDB, error } = await supabase
      .from('scheduled_bills')
      .insert(billToInsert)
      .select();

    if (error || !newBillsFromDB || newBillsFromDB.length === 0) {
      console.error("Erro ao salvar agendamento no Supabase:", error);
      return false;
    }

    setScheduledBills(prev => [...prev, mapFromDB(newBillsFromDB[0])]);
    return true;
  };

  const updateScheduledBill = async (id: string, updates: any) => {
    const updated = scheduledBills.map(b => b.id === id ? { ...b, ...updates } : b);
    setScheduledBills(updated);
    if (isGuest) {
      storage.set('bills', userId!, updated);
    } else {
      await supabase.from('scheduled_bills').update(mapToDB(updates)).eq('id', id);
    }
  };

  const deleteTransaction = async (id: string) => {
    const original = transactions.find(t => t.id === id);
    const updated = original?.seriesId 
      ? transactions.filter(t => t.seriesId !== original.seriesId) 
      : transactions.filter(t => t.id !== id);
      
    if (!isGuest) {
      if (original?.seriesId) await supabase.from('transactions').delete().eq('series_id', original.seriesId);
      else await supabase.from('transactions').delete().eq('id', id);
    }
    setTransactions(updated);
    if (isGuest) storage.set('transactions', userId!, updated);
  };

  const deleteScheduledBill = async (id: string) => {
    const updated = scheduledBills.filter(b => b.id !== id);
    setScheduledBills(updated);
    if (isGuest) storage.set('bills', userId!, updated);
    else await supabase.from('scheduled_bills').delete().eq('id', id);
  };

  const addCategory = async (cat: any): Promise<boolean> => {
    if (!userId) {
      console.error("Tentativa de adicionar categoria sem um ID de usuário válido.");
      return false;
    }
    
    if (isGuest) {
      const newCat = { ...cat, id: `cat_${Date.now()}`, userId, isDefault: false };
      const updatedCategories = [...categories, newCat];
      setCategories(updatedCategories);
      storage.set('categories', userId, updatedCategories);
      return true;
    }
    
    const categoryToInsert = {
        name: cat.name,
        type: cat.type,
        icon: cat.icon,
        color: cat.color,
        user_id: userId,
        is_default: false
    };

    const { data: newCategoriesFromDB, error } = await supabase
      .from('categories')
      .insert(categoryToInsert)
      .select();

    if (error || !newCategoriesFromDB || newCategoriesFromDB.length === 0) { 
      console.error("Erro ao salvar categoria no Supabase (verifique RLS):", error); 
      return false;
    }

    setCategories(prev => [...prev, mapFromDB(newCategoriesFromDB[0])]);
    return true;
  };

  const deleteCategory = async (id: string) => {
    const originalCategories = [...categories];
    const categoryToDelete = categories.find(c => c.id === id);

    // Atualização otimista da UI
    setCategories(prev => prev.filter(c => c.id !== id));

    if (isGuest) {
      const updated = originalCategories.filter(c => c.id !== id);
      storage.set('categories', userId!, updated);
      return;
    }
    
    // Operação no banco de dados com verificação
    const { data: deletedData, error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .select();

    // Se houver erro OU se nada for retornado (indicando falha por RLS/FK)
    if (error || !deletedData || deletedData.length === 0) {
      console.error("Erro ao excluir categoria (verifique RLS e constraints):", error);
      alert(`Não foi possível excluir a categoria "${categoryToDelete?.name}".\n\nIsso pode ocorrer porque ela está em uso ou por uma falha de permissão no banco. Verifique o console para detalhes.`);
      setCategories(originalCategories); // Reverte o estado
    }
  };

  const toggleBillPaid = async (billId: string, month: number, year: number) => {
    const existingIndex = billStatuses.findIndex(s => s.billId === billId && s.month === month && s.year === year);
    let newStatuses = [...billStatuses];
    if (existingIndex > -1) {
      const newState = !newStatuses[existingIndex].paid;
      newStatuses[existingIndex] = { ...newStatuses[existingIndex], paid: newState };
      if (!isGuest) await supabase.from('bill_statuses').update({ paid: newState }).match({ bill_id: billId, month, year, user_id: userId });
    } else {
      const newStatus = { billId, month, year, paid: true, userId: userId };
      newStatuses.push(newStatus);
      if (!isGuest) await supabase.from('bill_statuses').insert(mapToDB(newStatus));
    }
    setBillStatuses(newStatuses);
    if (isGuest) storage.set('statuses', userId!, newStatuses);
  };
  
  const exportUserData = () => {
    const data = {
      transactions,
      categories,
      scheduledBills,
      billStatuses,
      version: '1.0'
    };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
    const link = document.createElement('a');
    link.href = jsonString;
    const today = new Date().toISOString().split('T')[0];
    link.download = `finanly_backup_${today}.json`;
    link.click();
  };

  const importUserData = async (jsonContent: string): Promise<{ success: boolean; message: string }> => {
    if (!userId) return { success: false, message: "Usuário não identificado." };

    try {
      const data = JSON.parse(jsonContent);
      if (!data.transactions || !data.categories) {
        return { success: false, message: "Arquivo de backup inválido ou corrompido." };
      }
      
      const newTransactions = data.transactions || [];
      const newCategories = data.categories || [];
      const newScheduledBills = data.scheduledBills || [];
      const newBillStatuses = data.billStatuses || [];

      if (isGuest) {
        setTransactions(newTransactions);
        setCategories(newCategories);
        setScheduledBills(newScheduledBills);
        setBillStatuses(newBillStatuses);
        storage.set('transactions', userId, newTransactions);
        storage.set('categories', userId, newCategories);
        storage.set('bills', userId, newScheduledBills);
        storage.set('statuses', userId, newBillStatuses);
      } else {
        setLoading(true);
        // Wipe and restore pattern for Supabase
        await supabase.from('transactions').delete().eq('user_id', userId);
        await supabase.from('categories').delete().eq('user_id', userId);
        await supabase.from('scheduled_bills').delete().eq('user_id', userId);
        await supabase.from('bill_statuses').delete().eq('user_id', userId);

        await supabase.from('categories').insert(newCategories.map((c: any) => mapToDB({ ...c, userId })));
        await supabase.from('transactions').insert(newTransactions.map((t: any) => mapToDB({ ...t, userId })));
        await supabase.from('scheduled_bills').insert(newScheduledBills.map((b: any) => mapToDB({ ...b, userId })));
        await supabase.from('bill_statuses').insert(newBillStatuses.map((s: any) => mapToDB({ ...s, userId })));
        
        // Update local state after DB operations
        setTransactions(newTransactions);
        setCategories(newCategories);
        setScheduledBills(newScheduledBills);
        setBillStatuses(newBillStatuses);
        setLoading(false);
      }
      return { success: true, message: "Dados restaurados com sucesso!" };
    } catch (error) {
      console.error("Erro ao importar dados:", error);
      setLoading(false);
      return { success: false, message: "Ocorreu um erro ao processar o arquivo de backup." };
    }
  };

  return {
    transactions, categories, scheduledBills, billStatuses, loading,
    addTransaction, updateTransaction, deleteTransaction, addScheduledBill, deleteScheduledBill, updateScheduledBill,
    addCategory, deleteCategory, toggleBillPaid, exportUserData, importUserData
  };
};