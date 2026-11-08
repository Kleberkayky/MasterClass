# BANCO-DE-DADOS-2

Este repositório contém o código-fonte da aplicação web desenvolvida para a disciplina de Banco de Dados 2.

---

##  Requisitos Préveis e Configuração do Ambiente

Antes de começar, certifique-se de ter as seguintes ferramentas instaladas na sua máquina:

1. **[Node.js](https://nodejs.org/)** (versão 18+ recomendada)
2. **[Git](https://git-scm.com/)**
3. **[VS Code](https://code.visualstudio.com/)**

---

##  Guia de Comandos Rápidos (Pronto para Uso)

Abra o terminal do **VS Code** (`Ctrl + '` ou `Terminal > New Terminal`) e execute os passos a seguir:

### 1. Clonar o Repositório (se necessário)
```bash
git clone <URL_DO_SEU_REPOSITORIO>
cd BANCO-DE-DADOS-2
```

### 2. Instalação das Dependências

Dependendo do ecossistema utilizado no seu projeto (Front-end em React, Vite, Node/Express, etc.), escolha a seção correspondente:

#### Opção A: Projeto com `npm` (React / Vite / Node.js)
```bash
# Instalar todas as dependências do package.json
npm install
```

*Se for um projeto do zero ou precisar das bibliotecas base explicitamente:*
```bash
# Dependências principais de UI e Ícones (Lucide / Tailwind / Router)
npm install react react-dom react-router-dom lucide-react

# Dependências de desenvolvimento (Tailwind CSS, Vite, etc.)
npm install -D vite tailwindcss postcss autoprefixer
```

#### Opção B: Dependências do Back-end (se aplicável)
```bash
# Exemplo para servidor Node/Express + Banco de dados (Postgres/MySQL/Prisma)
npm install express cors dotenv pg sqlite3 prisma @prisma/client
```

---

##  Como Rodar o Site Localmente

Após instalar as dependências, execute o comando de inicialização correspondente:

### Executar a aplicação (Front-end / Vite / React)
```bash
npm run dev
```
> O terminal exibirá um link local, geralmente: `http://localhost:5173` ou `http://localhost:3000`.

### Executar o Back-end (caso exista um servidor separado)
```bash
npm start
# ou
node server.js
```

---

##  Principais Bibliotecas Utilizadas

- **React**: Biblioteca principal para construção da interface.
- **Lucide React**: Biblioteca de ícones interativos.
- **Tailwind CSS**: Estilização e layout responsivo.
- **React Router**: Gerenciamento de rotas e navegação.