# 💰 Finanly - Controle Financeiro Inteligente

Bem-vindo ao **Finanly**, seu novo assistente pessoal de finanças. Este projeto foi desenvolvido com React, TypeScript, Tailwind CSS, Supabase e Inteligência Artificial (Gemini API).

## 🚀 Como Rodar o Projeto

### Opção A: Deploy na Vercel (Recomendado para Máquinas Corporativas)

Se você não consegue instalar o Node.js na sua máquina, a melhor forma é usar a Vercel conectada ao seu GitHub:

1.  **Suba o código para o GitHub:** Siga as instruções da seção "Como Enviar para o GitHub".
2.  **Importe na Vercel:** Crie um novo projeto na Vercel e selecione o repositório do GitHub.
3.  **Configure as Variáveis de Ambiente:** No passo de configuração da Vercel (ou em *Settings > Environment Variables*), adicione:
    *   `VITE_SUPABASE_URL`: Sua URL do Supabase.
    *   `VITE_SUPABASE_ANON_KEY`: Sua chave Anon do Supabase.
    *   `API_KEY`: Sua chave da Gemini API.
4.  **Aguarde o Deploy:** A Vercel vai gerar um link público para o seu app.

---

### Opção B: Rodar Localmente (Exige Node.js)

1.  **Instalação:** Rode `npm install` na pasta do projeto.
2.  **Configuração:** Crie um arquivo chamado `.env` (use o `.env.example` como base) e coloque suas chaves.
3.  **Banco de Dados:** Execute o conteúdo do arquivo `database.sql` no SQL Editor do seu projeto Supabase.
4.  **Iniciar:** Rode `npm run dev` e acesse `http://localhost:5173`.

---

## 📤 Como Enviar para o GitHub "Comandos"

1. Crie um novo repositório vazio no GitHub.
2. No terminal da pasta do projeto:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/NOME_DO_REPO.git
git push -u origin main
```

**Nota sobre Segurança:** O arquivo `.env` nunca é enviado ao GitHub (está protegido pelo `.gitignore`). Você deve configurar as chaves manualmente na plataforma de hospedagem (Vercel).
