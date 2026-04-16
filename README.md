# 💰 FinanceHub

> Controle financeiro pessoal moderno, mobile-first e conectado à nuvem.

![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?style=flat-square&logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.2-06B6D4?style=flat-square&logo=tailwindcss)

---

## ✨ Funcionalidades

- **Dashboard** — saldo total, entradas/saídas, gráfico de categorias e evolução financeira dos últimos 6 meses
- **Transações** — listagem completa com busca e filtros por período (hoje, 7 dias, este mês)
- **Relatórios** — visão por categoria com barras de progresso e exportação em **PDF** com layout profissional
- **Categorias** — crie, edite e exclua categorias de receita e despesa com ícone e cor personalizados
- **Perfil** — edite nome, defina limite mensal de gastos com barra de progresso em tempo real
- **Autenticação** — login e cadastro com email/senha via Supabase Auth
- **Modo escuro/claro** — toggle persistido na sessão

---

## 📱 Compatibilidade Mobile

Otimizado para **iPhone 13 e 15** no Safari:

- `env(safe-area-inset-*)` para notch e Dynamic Island
- `100dvh` para viewport dinâmica correta no Safari iOS
- Prevenção de zoom automático em inputs (`font-size: 16px`)
- Momentum scrolling (`-webkit-overflow-scrolling: touch`)
- Fallbacks hex para cores `oklch` em iOS < 15.4

---

## 🗄️ Banco de Dados (Supabase)

| Tabela | Descrição |
|--------|-----------|
| `profiles` | Dados do usuário (nome, limite mensal, tema) |
| `categories` | Categorias por usuário (receita/despesa) |
| `transactions` | Todas as transações financeiras |
| `budgets` | Limites mensais por categoria |

- **RLS** ativo em todas as tabelas — cada usuário acessa apenas seus dados
- Trigger automático cria perfil + 13 categorias padrão no cadastro
- Views auxiliares para dashboard e relatórios

---

## 🚀 Como rodar localmente

### Pré-requisitos
- Node.js 18+
- Conta no [Supabase](https://supabase.com)

### 1. Clone o repositório
```bash
git clone https://github.com/Mateuskjk/FinanceHub.git
cd FinanceHub
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure o ambiente
Crie um arquivo `.env` na raiz:
```env
VITE_SUPABASE_URL=https://SEU_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
```
> Encontre essas chaves em: **Supabase Dashboard → Settings → API**

### 4. Configure o banco de dados
No **Supabase SQL Editor**, execute o conteúdo do arquivo [`supabase-schema.sql`](./supabase-schema.sql).

### 5. Rode o projeto
```bash
npm run dev
```

Acesse `http://localhost:3000`, crie sua conta e comece a usar.

---

## 🛠️ Stack

| Tecnologia | Uso |
|-----------|-----|
| [React 19](https://react.dev) | UI |
| [TypeScript 5.8](https://typescriptlang.org) | Tipagem |
| [TanStack Router](https://tanstack.com/router) | Roteamento file-based com SSR |
| [TanStack Query](https://tanstack.com/query) | Cache e sincronização de dados |
| [Supabase](https://supabase.com) | Auth, banco PostgreSQL e RLS |
| [Tailwind CSS 4](https://tailwindcss.com) | Estilização |
| [shadcn/ui](https://ui.shadcn.com) | Componentes base (Radix UI) |
| [Recharts](https://recharts.org) | Gráficos |
| [Framer Motion](https://framer.com/motion) | Animações |
| [jsPDF](https://github.com/parallax/jsPDF) | Exportação de relatório em PDF |
| [Vite 7](https://vite.dev) | Build e dev server |

---

## 📁 Estrutura do projeto

```
src/
├── components/
│   ├── ui/                    # shadcn/ui components
│   ├── AddTransactionSheet    # Modal de nova transação
│   ├── BalanceCard            # Card de saldo
│   ├── BottomNav              # Navegação inferior
│   ├── CategoryManager        # CRUD de categorias
│   ├── EditProfileSheet       # Edição de perfil
│   ├── MonthlyLimitSheet      # Definição de limite mensal
│   └── TransactionItem        # Item da lista de transações
├── hooks/
│   ├── use-auth.ts            # Estado de autenticação reativo
│   └── use-transactions.ts    # React Query hooks
├── lib/
│   ├── api.ts                 # Funções CRUD (Supabase)
│   ├── export-pdf.ts          # Geração de PDF com jsPDF
│   ├── supabase.ts            # Cliente Supabase
│   └── mock-data.ts           # Tipos, ícones e helpers
└── routes/
    ├── __root.tsx             # Layout raiz + auth guard
    ├── index.tsx              # Dashboard
    ├── transactions.tsx       # Lista de transações
    ├── reports.tsx            # Relatórios
    ├── settings.tsx           # Configurações
    └── login.tsx              # Login / Cadastro
```

---

## 📄 Licença

MIT © [Mateuskjk](https://github.com/Mateuskjk)
