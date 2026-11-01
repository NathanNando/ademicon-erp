<div align="center">

# 📊 ERP Ademicon

**Sistema web para organizar as vendas de consórcios: clientes, valores e quantidades em um só lugar.**

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Status](https://img.shields.io/badge/status-em%20desenvolvimento-orange?style=for-the-badge)

[Design no Figma](https://www.figma.com/site/9mjBZf1A1158iRLUwLY7YQ/ErpAdemicon) · [Reportar problema](../../issues)

</div>

---

## 📖 Sobre o projeto

O **ERP Ademicon** é um sistema web criado para ajudar consultores a acompanhar suas vendas de consórcios. Cada usuário tem a própria conta e enxerga **somente os seus dados**: clientes cadastrados, valores vendidos e quantidades, tudo resumido em um painel.

O visual segue fielmente o design feito no [Figma](https://www.figma.com/site/9mjBZf1A1158iRLUwLY7YQ/ErpAdemicon), que é o molde principal do projeto.

O projeto foi pensado para **iniciantes**: sem frameworks, com código em português, simples e comentado.

---

## ✨ Funcionalidades

- 🔐 **Login, cadastro e recuperação de senha** com Supabase Auth
- 👋 **Boas-vindas e resumo geral** com total de vendas, valores e quantidades
- 👥 **Seus clientes**: cadastro, listagem e acompanhamento
- 📈 **Relatórios** de vendas
- 🛡️ **Segurança por usuário** com RLS: ninguém acessa os dados de outra pessoa

---

## 🖼️ Telas

> Adicione aqui os prints do site depois de pronto, por exemplo em uma pasta `imagens/`.

| Login | Resumo geral | Seus clientes |
|:-----:|:------------:|:-------------:|
| *(print)* | *(print)* | *(print)* |

---

## 🛠️ Tecnologias

| Parte | Tecnologia |
|-------|-----------|
| Estrutura | HTML5 |
| Estilo | CSS3 (sem frameworks) |
| Lógica | JavaScript puro (sem frameworks) |
| Login e banco de dados | [Supabase](https://supabase.com) (Auth + PostgreSQL + RLS) |
| Design | [Figma](https://www.figma.com/site/9mjBZf1A1158iRLUwLY7YQ/ErpAdemicon) |

---

## 📁 Estrutura de pastas

```
erp-ademicon/
├── index.html               # Redireciona para o login
├── login.html               # Tela de login
├── cadastro.html            # Criação de conta
├── recuperar-senha.html     # Recuperação de senha
├── dashboard.html           # Boas-vindas e resumo geral
├── clientes.html            # Lista e cadastro dos seus clientes
├── relatorios.html          # Relatórios de vendas
├── css/                     # Estilos (cores, fontes e layout do Figma)
├── js/                      # Scripts de cada página + conexão com o Supabase
├── sql/                     # Tabelas e regras de segurança do banco
└── README.md
```

---

## 🚀 Como rodar o projeto

### 1. Baixe o código

```bash
git clone https://github.com/SEU-USUARIO/erp-ademicon.git
cd erp-ademicon
```

### 2. Configure o Supabase

1. Crie uma conta gratuita em [supabase.com](https://supabase.com) e clique em **New project**.
2. Abra o **SQL Editor** e execute, em ordem, os arquivos da pasta `sql/` (tabelas e depois regras de segurança RLS).
3. Vá em **Project Settings → API** e copie a **Project URL** e a chave **anon public**.
4. Cole os dois valores no arquivo de conexão em `js/` (ex.: `js/supabase.js`):

```js
const SUPABASE_URL = "COLE_AQUI_A_URL_DO_PROJETO";
const SUPABASE_ANON_KEY = "COLE_AQUI_A_CHAVE_ANON";
```

5. Em **Authentication → URL Configuration**, informe o endereço do site (ex.: `http://localhost:5500`) para o e-mail de recuperação de senha funcionar.

> ⚠️ Use somente a chave **anon public**. Nunca publique a chave `service_role` no GitHub.

### 3. Abra o site

Não precisa instalar nada. Escolha uma opção:

- **VS Code + Live Server:** clique com o botão direito em `index.html` e escolha **Open with Live Server**.
- **Python:** rode `python -m http.server 5500` na pasta do projeto e acesse `http://localhost:5500`.

---

## 🌐 Publicando o site

O projeto é estático (só HTML, CSS e JS), então pode ser publicado de graça no **GitHub Pages**:

1. No repositório, vá em **Settings → Pages**.
2. Em **Source**, escolha a branch `main` e a pasta `/ (root)`.
3. Salve e aguarde o link ser gerado.
4. Adicione esse link em **Authentication → URL Configuration** no Supabase.

---

## 🔒 Segurança

- Todas as tabelas usam **RLS (Row Level Security)**: cada usuário vê e altera apenas os próprios registros.
- As senhas são gerenciadas pelo Supabase Auth; o site nunca as guarda.
- Apenas a chave pública (**anon**) é usada no navegador.
- Nunca envie senhas, tokens ou a chave `service_role` ao GitHub.

---

## 🧭 Padrões do código

- Nomes de arquivos, variáveis e funções em **português**
- Código **simples e comentado**
- Sem bibliotecas ou frameworks, apenas HTML, CSS e JavaScript puro
- Cores, fontes e espaçamentos seguem o design do Figma

---

## 🗺️ Roadmap

- [ ] Finalizar as telas conforme o design do Figma
- [ ] Conectar login e cadastro ao Supabase Auth
- [ ] Criar tabelas e regras RLS na pasta `sql/`
- [ ] Resumo geral no dashboard
- [ ] Cadastro e listagem de clientes
- [ ] Relatórios de vendas

---

## 🤝 Como contribuir

1. Faça um **fork** do projeto
2. Crie uma branch: `git checkout -b minha-melhoria`
3. Faça o commit: `git commit -m "Descrição da melhoria"`
4. Envie: `git push origin minha-melhoria`
5. Abra um **Pull Request**

---

## 📄 Licença

Defina a licença do projeto antes de publicar (por exemplo, [MIT](https://choosealicense.com/licenses/mit/)) e adicione o arquivo `LICENSE` na raiz.

---

<div align="center">

Feito para a rotina de vendas de consórcios Ademicon.

</div>
