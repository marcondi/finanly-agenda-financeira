-- Finanly - Script de Configuração do Banco de Dados para Supabase
-- Versão 1.1 - Essencial para o funcionamento do App
-- 
-- Instruções:
-- 1. Vá para o painel do seu projeto no Supabase.
-- 2. No menu lateral, clique em "SQL Editor".
-- 3. Clique em "+ New query".
-- 4. Copie TODO o conteúdo deste arquivo e cole no editor.
-- 5. Clique em "RUN".
-- Este script pode ser executado com segurança múltiplas vezes.

-- 1. Tabela de Categorias
CREATE TABLE IF NOT EXISTS public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    type text NOT NULL, -- 'INCOME' or 'EXPENSE'
    icon text,
    color text,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

-- 2. Tabela de Transações
CREATE TABLE IF NOT EXISTS public.transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    description text NOT NULL,
    amount numeric(10, 2) NOT NULL,
    date timestamp with time zone NOT NULL,
    type text NOT NULL, -- 'INCOME' or 'EXPENSE'
    category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
    recurrence text DEFAULT 'NONE'::text NOT NULL,
    series_id text,
    created_at timestamp with time zone DEFAULT now()
);

-- 3. Tabela de Agendamentos (Contas a Pagar/Receber)
CREATE TABLE IF NOT EXISTS public.scheduled_bills (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    amount numeric(10, 2) NOT NULL,
    due_day integer NOT NULL,
    month integer,
    year integer,
    category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
    recurrence text DEFAULT 'NONE'::text NOT NULL,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);

-- 4. Tabela de Status de Pagamento dos Agendamentos
CREATE TABLE IF NOT EXISTS public.bill_statuses (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    bill_id uuid REFERENCES public.scheduled_bills(id) ON DELETE CASCADE NOT NULL,
    month integer NOT NULL,
    year integer NOT NULL,
    paid boolean DEFAULT false,
    transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT unique_bill_status UNIQUE (user_id, bill_id, month, year)
);

-- 5. Habilitar Row Level Security (RLS) para todas as tabelas
-- Esta é a etapa de segurança crucial!
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_statuses ENABLE ROW LEVEL SECURITY;

-- 6. Políticas de Acesso (Policies)
-- Estas regras garantem que os usuários só possam ver e manipular seus próprios dados.

-- Políticas para 'categories'
DROP POLICY IF EXISTS "Usuários podem gerenciar suas próprias categorias" ON public.categories;
CREATE POLICY "Usuários podem gerenciar suas próprias categorias" ON public.categories
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Políticas para 'transactions'
DROP POLICY IF EXISTS "Usuários podem gerenciar suas próprias transações" ON public.transactions;
CREATE POLICY "Usuários podem gerenciar suas próprias transações" ON public.transactions
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Políticas para 'scheduled_bills'
DROP POLICY IF EXISTS "Usuários podem gerenciar seus próprios agendamentos" ON public.scheduled_bills;
CREATE POLICY "Usuários podem gerenciar seus próprios agendamentos" ON public.scheduled_bills
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Políticas para 'bill_statuses'
DROP POLICY IF EXISTS "Usuários podem gerenciar os status de seus agendamentos" ON public.bill_statuses;
CREATE POLICY "Usuários podem gerenciar os status de seus agendamentos" ON public.bill_statuses
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 7. Índices para otimização de performance
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_bills_user_id ON public.scheduled_bills(user_id);
CREATE INDEX IF NOT EXISTS idx_bill_statuses_user_id ON public.bill_statuses(user_id);

-- Fim do script.
