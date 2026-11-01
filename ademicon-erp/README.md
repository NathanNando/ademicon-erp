# ERP Ademicon

Sistema web para organizar clientes, acompanhar indicadores comerciais e gerar relatórios.
Feito com **HTML, CSS e JavaScript puro** (sem frameworks) e **Supabase** (login, banco PostgreSQL e segurança RLS).

O visual segue o design do Figma "ErpAdemicon": degradê vinho → vermelho, menu e painéis cinza claros, botões pretos.

---

## O que o sistema faz

| Tela | Arquivo | Descrição |
|---|---|---|
| Login | `login.html` | E-mail e senha, mostrar/ocultar senha, link de recuperação, indicador de carregamento |
| Cadastro | `cadastro.html` | Cada funcionário cria a própria conta (nome, e-mail, senha e confirmação) |
| Recuperar senha | `recuperar-senha.html` | Envia o link por e-mail e, ao clicar nele, mostra o formulário de nova senha |
| Sejam bem-vindos | `index.html` | Boas-vindas com atalhos |
| Resumo geral | `dashboard.html` | Indicadores, últimos clientes, atividades recentes e gráficos (dados reais do banco) |
| Seus clientes | `clientes.html` | Cadastrar, pesquisar, filtrar, ordenar, paginar, editar e excluir |
| Relatórios | `relatorios.html` | Filtros por período/status/tipo, gráficos, exportação CSV e impressão |

---

## Estrutura de pastas

```text
ademicon-erp/
├── index.html              Boas-vindas
├── login.html
├── cadastro.html
├── recuperar-senha.html
├── dashboard.html          Resumo geral
├── clientes.html
├── relatorios.html
│
├── css/
│   ├── style.css           Cores (variáveis), base, botões, formulários, tabelas, janelas
│   ├── auth.css            Telas de login / cadastro / recuperação
│   ├── dashboard.css       Indicadores, grades, filtros, paginação
│   └── responsive.css      Tablet, celular e impressão
│
├── js/
│   ├── config.js           ← ÚNICO arquivo que você edita (URL e chave do Supabase)
│   ├── supabase.js         Cria a conexão com o Supabase
│   ├── utils.js            Validações, máscaras, formatação, avisos, gráficos, CSV, menu
│   ├── auth.js             Login, cadastro, recuperação de senha, logout, proteção de páginas
│   ├── inicio.js           Tela de boas-vindas
│   ├── dashboard.js        Resumo geral
│   ├── clientes.js         Gerenciamento de clientes
│   └── relatorios.js       Relatórios e exportação
│
├── sql/
│   ├── schema.sql          Tabelas, índices e gatilhos
│   ├── policies.sql        Segurança (RLS)
│   └── seed.sql            Dados de exemplo (opcional, só para testes)
│
├── img/
│   └── logo.svg            Logotipo provisório (veja "Logotipo")
│
└── README.md
```

---

## Passo a passo de instalação

### 1. Criar o projeto no Supabase

1. Acesse <https://supabase.com> e crie uma conta (ou entre).
2. Clique em **New project**.
3. Escolha um nome (ex.: `erp-ademicon`), defina uma **senha do banco** (guarde-a) e escolha a região mais próxima (ex.: *South America (São Paulo)*).
4. Aguarde alguns minutos até o projeto ficar pronto.

### 2. Criar as tabelas e a segurança (SQL)

No painel do Supabase, abra **SQL Editor** → **New query**. Execute **nesta ordem**, colando o conteúdo de cada arquivo e clicando em **Run**:

1. `sql/schema.sql`: cria as tabelas `profiles` e `customers`, índices e gatilhos.
2. `sql/policies.sql`: liga o RLS e cria as regras de acesso.
3. `sql/seed.sql` *(opcional)*: só depois de criar sua conta pelo sistema (veja o passo 6). Troque o e-mail dentro do arquivo pelo seu antes de executar.

Os scripts podem ser executados mais de uma vez sem problema.

### 3. Copiar as credenciais

No Supabase: **Project Settings → API** (ou **Connect**). Você precisa de:

- **Project URL**: algo como `https://abcdxyz.supabase.co`
- **Chave pública**: chamada de `anon` / `public` (ou `publishable`).

Abra `js/config.js` e substitua os textos de exemplo:

```js
window.APP_CONFIG = {
  SUPABASE_URL: "https://abcdxyz.supabase.co",
  SUPABASE_ANON_KEY: "eyJ...sua-chave-publica...",
  PAGE_SIZE: 10,
};
```

> **Nunca use a chave `service_role` no projeto.** Ela ignora toda a segurança. A chave pública (`anon`) pode ficar no navegador porque quem protege os dados são as regras RLS do banco.

### 4. Configurar o login (Authentication)

No Supabase, vá em **Authentication**:

- **Sign In / Providers → Email**: deixe o login por e-mail e senha ligado. Mantenha **Confirm email** ligado (recomendado). Com ele ligado, quem se cadastra precisa clicar no link recebido por e-mail antes de entrar. Se desligar, o usuário entra direto após o cadastro.
- **URL Configuration**:
  - **Site URL**: o endereço onde o sistema roda (ex.: `http://localhost:8000` nos testes, ou o endereço final quando publicar).
  - **Redirect URLs**: adicione `http://localhost:8000/recuperar-senha.html` e `http://localhost:8000/login.html` (e os equivalentes do endereço final). Sem isso, o link de "esqueci minha senha" não funciona.
- **Email Templates** *(opcional)*: traduza os e-mails de confirmação e de recuperação para português.

> O envio de e-mails do plano gratuito é limitado. Para uso real pela equipe, configure um provedor próprio em **Authentication → SMTP Settings**.

### 5. Rodar o site localmente

O sistema é estático (só arquivos), mas precisa de um servidor local, pois o login não funciona abrindo o arquivo com duplo clique. Dentro da pasta do projeto, use **uma** destas opções:

```bash
# Python (já vem instalado em muitos computadores)
python3 -m http.server 8000

# ou Node.js
npx serve -l 8000
```

Depois abra <http://localhost:8000/login.html>.

> Se usar outra porta, ajuste a **Site URL** e as **Redirect URLs** do passo 4.

### 6. Primeiro acesso

1. Abra `cadastro.html` e crie sua conta.
2. Confirme o e-mail, se a confirmação estiver ligada.
3. Entre pelo `login.html`: você será levado ao **Resumo geral**.
4. *(Opcional)* Para ver o sistema com dados de exemplo, edite o e-mail em `sql/seed.sql` e execute-o no SQL Editor.

---

## Regras de acesso aos dados (importante)

Por padrão, **cada funcionário vê e gerencia apenas os clientes que ele mesmo cadastrou**. Isso é garantido pelo banco (RLS em `sql/policies.sql`), não só pelo JavaScript: mesmo que alguém altere o código no navegador, o Supabase recusa o acesso.

- Quem não está logado não acessa nada.
- Ninguém consegue cadastrar cliente em nome de outra pessoa.
- Não existe `DELETE` liberado: a exclusão é **lógica** (o cliente recebe `deleted_at` e some das telas, mas continua guardado para histórico e rastreabilidade).

**Se a Ademicon quiser que toda a equipe veja os mesmos clientes**, não basta liberar a leitura para todos, pois qualquer pessoa que criasse uma conta passaria a ver os dados. O caminho seguro é criar uma estrutura de **empresa / equipe / membros** e liberar o acesso apenas aos membros. Isso exige uma evolução do SQL e do cadastro.

---

## Como cada indicador é calculado

- **Total / ativos / inativos**: contagem dos clientes não excluídos do funcionário logado.
- **Registros comerciais**: clientes que têm *observações comerciais* preenchidas.
- **Gráficos e relatórios**: calculados a partir dos mesmos dados. Se não houver dados, o sistema mostra uma mensagem informativa em vez de números inventados.

---

## Segurança e LGPD

- Senhas são gerenciadas pelo Supabase Auth (nunca ficam no seu banco nem em texto puro).
- RLS ligado nas duas tabelas; validação também no banco (formato de CPF/CNPJ, e-mail, telefone, status, UF).
- Textos vindos do usuário são escapados antes de aparecer na tela (proteção contra XSS) e a busca remove caracteres especiais dos filtros.
- CPF/CNPJ aparece **parcialmente oculto** na listagem. No CSV, também sai oculto por padrão, e o CPF/CNPJ completo só é exportado se você marcar a opção.
- Boas práticas LGPD para a empresa: coletar só o necessário, informar a finalidade ao cliente, limitar o acesso a quem precisa e definir um prazo de retenção. Este sistema fornece a base técnica, mas as políticas internas e a base legal do tratamento são responsabilidade da empresa.

---

## Logotipo

O arquivo `img/logo.svg` é um **logotipo provisório e original**, criado para este projeto. Para usar a marca oficial da empresa, substitua o arquivo `img/logo.svg` (mantendo o nome) **somente se você tiver autorização** para usar esse material. Se usar PNG, troque também o `src` em `js/utils.js` (função `montarMenu`) e nas páginas de login, cadastro e recuperação.

---

## Personalização rápida

- **Cores**: variáveis no início de `css/style.css` (`--cor-vermelho`, `--cor-vinho`, `--cor-cinza`...).
- **Linhas por página**: `PAGE_SIZE` em `js/config.js`.
- **Fontes**: *Inter* e *Khand* (Google Fonts), carregadas no `<head>` de cada página. Sem internet, o navegador usa fontes parecidas do sistema.

---

## Publicar na internet

Por ser um site estático, serve qualquer hospedagem de arquivos (Netlify, Vercel, Cloudflare Pages, GitHub Pages, servidor próprio). Depois de publicar:

1. Atualize **Site URL** e **Redirect URLs** no Supabase com o endereço final (use HTTPS).
2. Confira que `js/config.js` contém apenas a chave pública.

---

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| Aviso "O sistema ainda não está conectado ao Supabase" | `js/config.js` ainda com os textos de exemplo |
| "Confirme seu e-mail antes de entrar" | Clique no link do e-mail de confirmação (veja também a pasta de spam) |
| Link de recuperação abre erro ou não leva à tela de nova senha | Falta a URL em **Authentication → URL Configuration → Redirect URLs** |
| "Você não tem permissão para realizar esta operação" | O `sql/policies.sql` não foi executado, ou a sessão expirou |
| Tela de clientes vazia, mas existem dados | Os clientes pertencem a outro usuário (cada funcionário vê só os seus) |
| "Muitas tentativas" ao cadastrar ou recuperar senha | Limite de e-mails do Supabase; aguarde alguns minutos ou configure SMTP próprio |
| Página em branco / erros no console | Abra pelo servidor local (`http://localhost:8000`), não pelo arquivo direto |
