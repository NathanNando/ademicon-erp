# Ademicon ERP — Starter

Primeira versão do ERP interno com identidade visual baseada nas capturas do Figma (vermelho, preto e branco).

## Stack
- Frontend: HTML, CSS e JavaScript
- API: Python + FastAPI
- Login: Supabase Auth
- Dados: PostgreSQL do Supabase
- Gráficos: Chart.js

## 1. Pré-requisitos
- Python 3.11+
- Projeto criado no Supabase
- Navegador moderno

## 2. Configurar Supabase
1. No Supabase, abra **SQL Editor** e execute `database/schema.sql`.
2. Em **Project Settings → API**, copie a URL e a chave `anon`/publishable.
3. No backend, copie `backend/.env.example` para `backend/.env` e preencha:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (somente backend; nunca exponha no frontend)
   - `DATABASE_URL` (URI PostgreSQL do Supabase; use a connection string apropriada ao seu ambiente)
   - `FRONTEND_ORIGIN`
4. Configure o primeiro administrador manualmente: crie o usuário no Supabase Auth e insira seu `auth_user_id` em `public.employees` com `role = 'admin'` e `active = true`. O SQL de exemplo está em `database/first_admin.sql.example`.
5. Não coloque `.env` no Git nem compartilhe a `service_role`.

## 3. Rodar a API
```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
API: http://127.0.0.1:8000
Documentação: http://127.0.0.1:8000/docs

## 4. Rodar o frontend
Em outra janela do terminal:
```bash
cd frontend
python -m http.server 5500
```
Abra http://127.0.0.1:5500. Ajuste `SUPABASE_URL` e `SUPABASE_ANON_KEY` em `frontend/js/config.js`.

## O que já existe
- Login Supabase Auth e logout
- Rotas FastAPI protegidas por token Supabase
- Verificação de funcionário ativo e perfil
- Cadastro de funcionários apenas por administrador (convite por e-mail)
- Cadastro/listagem de clientes
- Dashboard com KPIs e gráficos de exemplo claramente identificados como demonstração quando não houver dados
- Estrutura inicial de tabelas SQL

## Atenção antes de produção
Este é um starter para desenvolvimento, não um sistema pronto para uso real. Revise políticas RLS, permissões, auditoria, regras comerciais, tratamento de dados pessoais, backups e testes. O acesso ao dashboard e às rotas é protegido pela API; o frontend não é uma barreira de segurança.
