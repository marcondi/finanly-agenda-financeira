
import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { SunIcon, MoonIcon } from '../components/Icons';

// Helper para buscar e validar a lista de e-mails salvos no localStorage
const getRememberedEmails = (): string[] => {
  try {
    const stored = localStorage.getItem('finanly_remembered_emails');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Garante que é um array de strings
      return Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string') : [];
    }
  } catch (e) {
    console.error("Falha ao ler e-mails lembrados:", e);
  }
  return [];
};

export function LoginPage() {
  const { login, isDarkMode, toggleDarkMode } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  
  // Mantém a preferência do usuário sobre "Lembrar de mim"
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('finanly_remember_state') === 'true');
  // Guarda a lista de e-mails para o preenchimento automático
  const [rememberedEmails, setRememberedEmails] = useState<string[]>(getRememberedEmails);

  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    password: '' 
  });
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Efeito para pré-preencher o e-mail na montagem do componente
  useEffect(() => {
    if (rememberedEmails.length > 0) {
      setFormData(prev => ({ ...prev, email: rememberedEmails[0] }));
    }
  }, []); // O array vazio garante que isso rode apenas uma vez

  // Salva a preferência do checkbox sempre que ele for alterado
  useEffect(() => {
    localStorage.setItem('finanly_remember_state', rememberMe ? 'true' : 'false');
  }, [rememberMe]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // --- LÓGICA CORRIGIDA: Salva o e-mail de forma mais robusta ---
    if (rememberMe) {
      const newEmail = formData.email.trim();
      if (newEmail) {
        // Usamos a atualização de estado funcional para garantir que estamos usando o valor mais recente.
        setRememberedEmails(prevEmails => {
          const updatedEmails = [newEmail, ...prevEmails.filter(e => e.toLowerCase() !== newEmail.toLowerCase())].slice(0, 5);
          // Persistimos a lista atualizada no localStorage
          localStorage.setItem('finanly_remembered_emails', JSON.stringify(updatedEmails));
          return updatedEmails;
        });
      }
    }

    if (!isSupabaseConfigured) {
      login({ 
        id: 'guest_user', 
        name: formData.name || 'Marcondes Local', 
        email: formData.email, 
        isGuest: true 
      });
      return;
    }

    setIsProcessing(true);
    try {
      if (isLogin) {
        const { error: ae } = await supabase.auth.signInWithPassword({ 
          email: formData.email, 
          password: formData.password 
        });
        if (ae) throw ae;
      } else {
        const { error: ae } = await supabase.auth.signUp({ 
          email: formData.email, 
          password: formData.password, 
          options: { data: { full_name: formData.name } } 
        });
        if (ae) throw ae;
        alert("Conta criada com sucesso! Faça o login para continuar.");
        setIsLogin(true);
      }
    } catch (err: any) { 
      setError(err?.message || "Erro no login."); 
    } finally { 
      setIsProcessing(false); 
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-[#020617]">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-8 border border-slate-200 dark:border-slate-800">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl mx-auto flex items-center justify-center text-4xl mb-6 shadow-xl text-white font-bold transform -rotate-6">💰</div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">Finanly.</h1>
          <p className="text-slate-500 text-xs font-black uppercase tracking-widest mt-2">
            {isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <input 
              type="text" 
              placeholder="SEU NOME" 
              className="w-full px-6 py-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-white font-bold focus:outline-none focus:border-indigo-500 transition-colors uppercase text-xs tracking-widest" 
              value={formData.name} 
              onChange={e => setFormData({ ...formData, name: e.target.value })} 
              required
            />
          )}
          {/* --- CAMPO DE E-MAIL COM SUGESTÕES AUTOMÁTICAS --- */}
          <input 
            type="email" 
            placeholder="E-MAIL" 
            className="w-full px-6 py-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-white font-bold focus:outline-none focus:border-indigo-500 transition-colors uppercase text-xs tracking-widest" 
            value={formData.email} 
            onChange={e => setFormData({ ...formData, email: e.target.value })} 
            required
            list="remembered-emails" // Conecta o input com a lista de sugestões
          />
          <datalist id="remembered-emails">
            {rememberedEmails.map(email => <option key={email} value={email} />)}
          </datalist>

          <input 
            type="password" 
            placeholder="SENHA" 
            className="w-full px-6 py-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-white font-bold focus:outline-none focus:border-indigo-500 transition-colors uppercase text-xs tracking-widest" 
            value={formData.password} 
            onChange={e => setFormData({ ...formData, password: e.target.value })} 
            required
          />
          
          <div className="flex items-center gap-2 px-2">
            <input 
              type="checkbox" 
              id="remember" 
              checked={rememberMe} 
              onChange={e => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor="remember" className="text-[10px] font-black text-slate-500 uppercase tracking-widest cursor-pointer select-none">
              Lembrar de mim
            </label>
          </div>

          <button 
            type="submit" 
            disabled={isProcessing} 
            className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-xl shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest text-xs"
          >
            {isProcessing ? 'Processando...' : (isLogin ? 'Entrar Agora' : 'Finalizar Cadastro')}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
          <button 
            onClick={() => setIsLogin(!isLogin)} 
            className="w-full text-indigo-500 font-black uppercase text-[10px] tracking-widest hover:text-indigo-400 transition-colors"
          >
            {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já possui uma conta? Faça Login'}
          </button>
        </div>

        <div className="mt-8 flex justify-center">
          <button onClick={toggleDarkMode} className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 transition-all hover:scale-110">
            {isDarkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
