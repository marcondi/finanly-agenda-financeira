import React, { useState, useEffect, createContext, useContext } from 'react';
import { User, AuthState } from './types';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { LoginPage } from './pages/LoginPage';
import { Dashboard } from './pages/Dashboard';
import { Session } from '@supabase/supabase-js';

interface AuthContextType extends AuthState {
  login: (user: User) => void;
  logout: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

export function App() {
  const [authState, setAuthState] = useState<AuthState>(() => {
    const saved = localStorage.getItem('finanly_guest_session');
    if (saved) return { user: JSON.parse(saved), isAuthenticated: true };
    return { user: null, isAuthenticated: false };
  });
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const savedTheme = localStorage.getItem('finanly_theme');
      if (savedTheme) return savedTheme === 'dark';
    } catch (e) {}
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (authState.user?.isGuest) {
      setLoading(false);
      return;
    }

    if (isSupabaseConfigured) {
      supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null }}) => {
        if (session) {
          setAuthState({
            user: { 
              id: session.user.id, 
              name: session.user.user_metadata.full_name || session.user.email?.split('@')[0] || 'Usuário',
              email: session.user.email || '' 
            },
            isAuthenticated: true
          });
        }
        setLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
        if (session) {
          setAuthState({
            user: { 
              id: session.user.id, 
              name: session.user.user_metadata.full_name || session.user.email?.split('@')[0] || 'Usuário',
              email: session.user.email || '' 
            },
            isAuthenticated: true
          });
        } else if (!authState.user?.isGuest) {
          setAuthState({ user: null, isAuthenticated: false });
        }
      });
      return () => subscription.unsubscribe();
    } else {
      setLoading(false);
    }
  }, [isSupabaseConfigured]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('finanly_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('finanly_theme', 'light');
    }
  }, [isDarkMode]);

  const login = (user: User) => {
    if (user.isGuest) {
      localStorage.setItem('finanly_guest_session', JSON.stringify(user));
    }
    setAuthState({ user, isAuthenticated: true });
  };

  const logout = async () => {
    if (isSupabaseConfigured) await supabase.auth.signOut();
    localStorage.removeItem('finanly_guest_session');
    setAuthState({ user: null, isAuthenticated: false });
  };

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="animate-pulse text-indigo-600 font-bold uppercase tracking-widest text-xs">Iniciando Finanly...</div>
    </div>
  );

  return (
    <AuthContext.Provider value={{ ...authState, login, logout, isDarkMode, toggleDarkMode }}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
        {!authState.isAuthenticated ? (
          <LoginPage />
        ) : (
          <Dashboard />
        )}
      </div>
    </AuthContext.Provider>
  );
}