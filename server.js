<<<<<<< HEAD
const express = require('express');
const { z } = require('zod');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const app = express();
const USERS_FILE = path.join(__dirname, 'users.json');

// Aumenta o limite de payload para suportar imagens em Base64
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

// Função auxiliar para carregar usuários do JSON
function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    const defaultPasswordHash = bcrypt.hashSync('K16449766k@', 10);
    const initialUsers = [
      {
        id: '1',
        name: 'Administrador Master',
        email: 'kleber@email.com',
        role: 'Administrador',
        avatar: '',
        passwordHash: defaultPasswordHash,
        createdAt: new Date().toISOString()
      }
    ];
    fs.writeFileSync(USERS_FILE, JSON.stringify(initialUsers, null, 2), 'utf-8');
    return initialUsers;
  }

  try {
    const data = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error("Erro ao ler users.json:", err);
    return [];
  }
}

// Função auxiliar para salvar usuários no JSON
function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

loadUsers();

// =========================================================================
// MIDDLEWARE DE PERMISSÃO DE ACESSO (EXPLICADO ABAIXO)
// =========================================================================
function verificarPermissao(...perfisPermitidos) {
  return (req, res, next) => {
    // 1. Pega o perfil enviado nos headers (simulando token/sessão decodificada)
    const perfilUsuario = req.headers['x-user-role'];

    if (!perfilUsuario) {
      return res.status(401).json({ message: 'Não autenticado. Perfil não informado.' });
    }

    // 2. Verifica se o perfil do usuário está incluído na lista de perfis autorizados da rota
    if (!perfisPermitidos.includes(perfilUsuario)) {
      return res.status(403).json({ 
        message: `Acesso negado: Perfil '${perfilUsuario}' não tem permissão para esta funcionalidade.` 
      });
    }

    // 3. Permite a requisição prosseguir
    next();
  };
}

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const registerSchema = z.object({
  name: z.string().optional(),
  email: z
    .string()
    .min(1, { message: 'O e-mail é obrigatório.' })
    .email({ message: 'Insira um e-mail válido.' }),
  
  confirmEmail: z
    .string()
    .min(1, { message: 'A confirmação de e-mail é obrigatória.' })
    .email({ message: 'Insira um e-mail válido.' }),

  role: z.enum(['Aluno', 'Professor', 'Administrador'], {
    required_error: 'Selecione o tipo de conta.'
  }),

  password: z
    .string()
    .min(1, { message: 'A senha é obrigatória.' })
    .min(8, { message: 'A senha deve conter no mínimo 8 caracteres.' })
    .regex(passwordRegex, {
      message: 'A senha deve conter maiúscula, minúscula, número e caractere especial (@$!%*?&).'
    }),

  confirmPassword: z
    .string()
    .min(1, { message: 'A confirmação de senha é obrigatória.' })
})
.refine(data => data.email === data.confirmEmail, {
  message: 'Os e-mails não coincidem.',
  path: ['confirmEmail'],
})
.refine(data => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem.',
  path: ['confirmPassword'],
});

// Endpoint de Cadastro
app.post('/register', async (req, res) => {
  const result = registerSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({ issues: result.error.issues });
  }

  const { name, email, password, role } = result.data;
  const users = loadUsers();

  const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return res.status(400).json({
      issues: [{ path: ['email'], message: 'Este e-mail já está cadastrado no sistema.' }]
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const newUser = {
    id: Date.now().toString(),
    name: name && name.trim() !== '' ? name.trim() : 'Usuário Master Class',
    email: email.toLowerCase(),
    role: role,
    avatar: '',
    passwordHash: passwordHash,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers(users);

  return res.status(200).json({
    message: 'Cadastro na Master Class realizado com sucesso!'
  });
});

// Endpoint de Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Informe e-mail e senha.' });
  }

  const users = loadUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return res.status(401).json({ message: 'E-mail ou senha inválidos.' });
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    return res.status(401).json({ message: 'E-mail ou senha inválidos.' });
  }

  return res.status(200).json({
    message: 'Login realizado com sucesso!',
    user: {
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar || ''
    }
  });
});

// =========================================================================
// ROTA DE ATUALIZAÇÃO DO PERFIL (NOME E FOTO POR UPLOAD)
// =========================================================================
app.put('/api/profile', (req, res) => {
  const { email, name, avatar } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Identificação do usuário é necessária.' });
  }

  const users = loadUsers();
  const userIndex = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());

  if (userIndex === -1) {
    return res.status(404).json({ message: 'Usuário não encontrado.' });
  }

  if (name && name.trim() !== '') {
    users[userIndex].name = name.trim();
  }
  if (avatar !== undefined) {
    users[userIndex].avatar = avatar;
  }

  saveUsers(users);

  return res.status(200).json({
    message: 'Perfil atualizado com sucesso!',
    user: {
      name: users[userIndex].name,
      email: users[userIndex].email,
      role: users[userIndex].role,
      avatar: users[userIndex].avatar
    }
  });
});

// =========================================================================
// EXEMPLOS DE ROTAS RESTRITAS UTILIZANDO O MIDDLEWARE 'verificarPermissao'
// =========================================================================

// Rota restrita APENAS para Administradores
app.get('/api/admin/relatorio', verificarPermissao('Administrador'), (req, res) => {
  return res.status(200).json({ message: 'Acesso concedido: Relatório Administrativo retornado.' });
});

// Rota restrita para Professores e Administradores
app.get('/api/professor/pauta', verificarPermissao('Professor', 'Administrador'), (req, res) => {
  return res.status(200).json({ message: 'Acesso concedido: Pauta de chamadas retornada.' });
});

app.listen(3000, () => {
  console.log('Servidor Master Class rodando em http://localhost:3000');
=======
const express = require('express');
const { z } = require('zod');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const app = express();
const USERS_FILE = path.join(__dirname, 'users.json');

// Aumenta o limite de payload para suportar imagens em Base64
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

// Função auxiliar para carregar usuários do JSON
function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    const defaultPasswordHash = bcrypt.hashSync('K16449766k@', 10);
    const initialUsers = [
      {
        id: '1',
        name: 'Administrador Master',
        email: 'kleber@email.com',
        role: 'Administrador',
        avatar: '',
        passwordHash: defaultPasswordHash,
        createdAt: new Date().toISOString()
      }
    ];
    fs.writeFileSync(USERS_FILE, JSON.stringify(initialUsers, null, 2), 'utf-8');
    return initialUsers;
  }

  try {
    const data = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error("Erro ao ler users.json:", err);
    return [];
  }
}

// Função auxiliar para salvar usuários no JSON
function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

loadUsers();

// =========================================================================
// MIDDLEWARE DE PERMISSÃO DE ACESSO (EXPLICADO ABAIXO)
// =========================================================================
function verificarPermissao(...perfisPermitidos) {
  return (req, res, next) => {
    // 1. Pega o perfil enviado nos headers (simulando token/sessão decodificada)
    const perfilUsuario = req.headers['x-user-role'];

    if (!perfilUsuario) {
      return res.status(401).json({ message: 'Não autenticado. Perfil não informado.' });
    }

    // 2. Verifica se o perfil do usuário está incluído na lista de perfis autorizados da rota
    if (!perfisPermitidos.includes(perfilUsuario)) {
      return res.status(403).json({ 
        message: `Acesso negado: Perfil '${perfilUsuario}' não tem permissão para esta funcionalidade.` 
      });
    }

    // 3. Permite a requisição prosseguir
    next();
  };
}

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const registerSchema = z.object({
  name: z.string().optional(),
  email: z
    .string()
    .min(1, { message: 'O e-mail é obrigatório.' })
    .email({ message: 'Insira um e-mail válido.' }),
  
  confirmEmail: z
    .string()
    .min(1, { message: 'A confirmação de e-mail é obrigatória.' })
    .email({ message: 'Insira um e-mail válido.' }),

  role: z.enum(['Aluno', 'Professor', 'Administrador'], {
    required_error: 'Selecione o tipo de conta.'
  }),

  password: z
    .string()
    .min(1, { message: 'A senha é obrigatória.' })
    .min(8, { message: 'A senha deve conter no mínimo 8 caracteres.' })
    .regex(passwordRegex, {
      message: 'A senha deve conter maiúscula, minúscula, número e caractere especial (@$!%*?&).'
    }),

  confirmPassword: z
    .string()
    .min(1, { message: 'A confirmação de senha é obrigatória.' })
})
.refine(data => data.email === data.confirmEmail, {
  message: 'Os e-mails não coincidem.',
  path: ['confirmEmail'],
})
.refine(data => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem.',
  path: ['confirmPassword'],
});

// Endpoint de Cadastro
app.post('/register', async (req, res) => {
  const result = registerSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({ issues: result.error.issues });
  }

  const { name, email, password, role } = result.data;
  const users = loadUsers();

  const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return res.status(400).json({
      issues: [{ path: ['email'], message: 'Este e-mail já está cadastrado no sistema.' }]
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const newUser = {
    id: Date.now().toString(),
    name: name && name.trim() !== '' ? name.trim() : 'Usuário Master Class',
    email: email.toLowerCase(),
    role: role,
    avatar: '',
    passwordHash: passwordHash,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers(users);

  return res.status(200).json({
    message: 'Cadastro na Master Class realizado com sucesso!'
  });
});

// Endpoint de Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Informe e-mail e senha.' });
  }

  const users = loadUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return res.status(401).json({ message: 'E-mail ou senha inválidos.' });
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    return res.status(401).json({ message: 'E-mail ou senha inválidos.' });
  }

  return res.status(200).json({
    message: 'Login realizado com sucesso!',
    user: {
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar || ''
    }
  });
});

// =========================================================================
// ROTA DE ATUALIZAÇÃO DO PERFIL (NOME E FOTO POR UPLOAD)
// =========================================================================
app.put('/api/profile', (req, res) => {
  const { email, name, avatar } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Identificação do usuário é necessária.' });
  }

  const users = loadUsers();
  const userIndex = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());

  if (userIndex === -1) {
    return res.status(404).json({ message: 'Usuário não encontrado.' });
  }

  if (name && name.trim() !== '') {
    users[userIndex].name = name.trim();
  }
  if (avatar !== undefined) {
    users[userIndex].avatar = avatar;
  }

  saveUsers(users);

  return res.status(200).json({
    message: 'Perfil atualizado com sucesso!',
    user: {
      name: users[userIndex].name,
      email: users[userIndex].email,
      role: users[userIndex].role,
      avatar: users[userIndex].avatar
    }
  });
});

// =========================================================================
// EXEMPLOS DE ROTAS RESTRITAS UTILIZANDO O MIDDLEWARE 'verificarPermissao'
// =========================================================================

// Rota restrita APENAS para Administradores
app.get('/api/admin/relatorio', verificarPermissao('Administrador'), (req, res) => {
  return res.status(200).json({ message: 'Acesso concedido: Relatório Administrativo retornado.' });
});

// Rota restrita para Professores e Administradores
app.get('/api/professor/pauta', verificarPermissao('Professor', 'Administrador'), (req, res) => {
  return res.status(200).json({ message: 'Acesso concedido: Pauta de chamadas retornada.' });
});

app.listen(3000, () => {
  console.log('Servidor Master Class rodando em http://localhost:3000');
>>>>>>> 81a2e70defddca623fd17c03ac1523d319381008
});