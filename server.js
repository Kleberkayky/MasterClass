const express = require('express');
const { z } = require('zod');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const app = express();
const USERS_FILE = path.join(__dirname, 'users.json');
const COURSES_FILE = path.join(__dirname, 'courses.json');
const SUBMISSIONS_FILE = path.join(__dirname, 'submissions.json');

app.use(express.json({ limit: '20mb' }));
app.use(express.static(__dirname));

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
        assignedCourse: '',
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

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

function loadCourses() {
  if (!fs.existsSync(COURSES_FILE)) {
    const initialCourses = [
      {
        id: 'prog2',
        title: 'Programação 2',
        description: 'Desenvolvimento web completo, Zod, Middlewares e Criptografia.',
        modules: [
          { id: 'mod1', name: 'Módulo 1: Fundamentos e Estruturação', contents: [] },
          { id: 'mod2', name: 'Módulo 2: Intermediário e APIs', contents: [] },
          { id: 'mod3', name: 'Módulo 3: Avançado e Arquitetura', contents: [] }
        ]
      },
      {
        id: 'uiux',
        title: 'Design de Interfaces UI/UX',
        description: 'Princípios de Glassmorphic e Neo Frutiger Design.',
        modules: [
          { id: 'mod1', name: 'Módulo 1: Fundamentos de UI', contents: [] },
          { id: 'mod2', name: 'Módulo 2: Wireframes e Prototipagem', contents: [] },
          { id: 'mod3', name: 'Módulo 3: Design System Avançado', contents: [] }
        ]
      },
      {
        id: 'db',
        title: 'Bancos de Dados Avançados',
        description: 'Modelagem relacional e otimização de consultas SQL e PL/pgSQL.',
        modules: [
          { id: 'mod1', name: 'Módulo 1: Modelagem Relacional e Normalização', contents: [] },
          { id: 'mod2', name: 'Módulo 2: Otimização de Consultas SQL', contents: [] },
          { id: 'mod3', name: 'Módulo 3: PL/pgSQL e Triggers', contents: [] }
        ]
      }
    ];
    fs.writeFileSync(COURSES_FILE, JSON.stringify(initialCourses, null, 2), 'utf-8');
    return initialCourses;
  }

  try {
    const data = fs.readFileSync(COURSES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error("Erro ao ler courses.json:", err);
    return [];
  }
}

function saveCourses(courses) {
  fs.writeFileSync(COURSES_FILE, JSON.stringify(courses, null, 2), 'utf-8');
}

function loadSubmissions() {
  if (!fs.existsSync(SUBMISSIONS_FILE)) {
    fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify([], null, 2), 'utf-8');
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(SUBMISSIONS_FILE, 'utf-8'));
  } catch (err) {
    return [];
  }
}

function saveSubmissions(subs) {
  fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(subs, null, 2), 'utf-8');
}

loadUsers();
loadCourses();
loadSubmissions();

function verificarPermissao(...perfisPermitidos) {
  return (req, res, next) => {
    const perfilUsuario = req.headers['x-user-role'];

    if (!perfilUsuario) {
      return res.status(401).json({ message: 'Não autenticado. Perfil não informado.' });
    }

    const perfilTratado = perfilUsuario.trim().toLowerCase();
    const permitidosTratados = perfisPermitidos.map(p => p.toLowerCase());

    if (!permitidosTratados.includes(perfilTratado)) {
      return res.status(403).json({ 
        message: `Acesso negado: Perfil '${perfilUsuario}' não tem permissão.` 
      });
    }

    next();
  };
}

function evaluateDeadlineServer(item, referenceDate = new Date()) {
  if (!item || !item.endDate) {
    return { fora_do_prazo: 'F', isPastEnd: false, isClosed: false };
  }
  const end = new Date(item.endDate);
  const isProva = item.e_prova === 'V';
  const toleranceMs = isProva ? 0 : (2 * 24 * 60 * 60 * 1000);
  const limit = new Date(end.getTime() + toleranceMs);

  const isPastEnd = referenceDate > end;
  const isClosed = referenceDate > limit;

  return {
    fora_do_prazo: isPastEnd ? 'V' : 'F',
    isPastEnd,
    isClosed
  };
}

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!\%*?&]{8,}$/;

const registerSchema = z.object({
  name: z.string().optional(),
  email: z.string().min(1, { message: 'O e-mail é obrigatório.' }).email({ message: 'Insira um e-mail válido.' }),
  confirmEmail: z.string().min(1, { message: 'A confirmação de e-mail é obrigatória.' }).email({ message: 'Insira um e-mail válido.' }),
  role: z.enum(['Aluno', 'Professor', 'Administrador'], { required_error: 'Selecione o tipo de conta.' }),
  password: z.string().min(1, { message: 'A senha é obrigatória.' }).min(8, { message: 'A senha deve conter no mínimo 8 caracteres.' }).regex(passwordRegex, { message: 'A senha deve conter maiúscula, minúscula, número e caractere especial (@$!%*?&).' }),
  confirmPassword: z.string().min(1, { message: 'A confirmação de senha é obrigatória.' })
}).refine(data => data.email === data.confirmEmail, {
  message: 'Os e-mails não coincidem.',
  path: ['confirmEmail'],
}).refine(data => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem.',
  path: ['confirmPassword'],
});

// Cursos API
app.get('/api/courses', (req, res) => {
  const courses = loadCourses();
  const users = loadUsers();
  const teachers = users.filter(u => u.role === 'Professor' && u.assignedCourse);

  const enrichedCourses = courses.map(c => {
    const courseTeachers = teachers
      .filter(t => t.assignedCourse === c.id)
      .map(t => ({ name: t.name, email: t.email }));
    return {
      ...c,
      teachers: courseTeachers
    };
  });

  return res.status(200).json({ courses: enrichedCourses });
});

app.post('/api/admin/courses', verificarPermissao('Administrador'), (req, res) => {
  const { title, description } = req.body;
  if (!title || title.trim() === '') {
    return res.status(400).json({ message: 'O título do curso é obrigatório.' });
  }

  const courses = loadCourses();
  const newCourse = {
    id: 'course_' + Date.now(),
    title: title.trim(),
    description: description ? description.trim() : '',
    modules: [
      { id: 'mod1', name: 'Módulo 1: Fundamentos', contents: [] },
      { id: 'mod2', name: 'Módulo 2: Intermediário', contents: [] },
      { id: 'mod3', name: 'Módulo 3: Avançado', contents: [] }
    ]
  };

  courses.push(newCourse);
  saveCourses(courses);
  return res.status(200).json({ message: 'Curso criado com sucesso!', course: newCourse });
});

// Adicionar conteúdo ou atividade ao módulo
app.post('/api/courses/:courseId/modules/:moduleId/content', verificarPermissao('Professor', 'Administrador'), (req, res) => {
  const { courseId, moduleId } = req.params;
  const { subject, description, textHtml, fileName, fileData, fileType, isAssignment, e_prova, evaluationCode, startDate, endDate, authorName, authorEmail } = req.body;

  if (!subject || subject.trim() === '') {
    return res.status(400).json({ message: 'O assunto é obrigatório.' });
  }

  if (isAssignment && (!startDate || !endDate)) {
    return res.status(400).json({ message: 'Data de início e fim são obrigatórias para atividades.' });
  }

  const validProvas = ['Av1', 'Av2', 'Av3'];
  const validAtividades = ['At1', 'At2', 'At3'];

  if (isAssignment) {
    if (e_prova === 'V' && !validProvas.includes(evaluationCode)) {
      return res.status(400).json({ message: 'Selecione uma identificação válida para Prova (Av1, Av2 ou Av3).' });
    }
    if (e_prova !== 'V' && !validAtividades.includes(evaluationCode)) {
      return res.status(400).json({ message: 'Selecione uma identificação válida para Atividade Avaliativa (At1, At2 ou At3).' });
    }
  }

  const courses = loadCourses();
  const course = courses.find(c => c.id === courseId);
  if (!course) {
    return res.status(404).json({ message: 'Curso não encontrado.' });
  }

  const moduleObj = course.modules.find(m => m.id === moduleId);
  if (!moduleObj) {
    return res.status(404).json({ message: 'Módulo não encontrado.' });
  }

  const newItem = {
    id: 'item_' + Date.now(),
    subject: subject.trim(),
    description: description ? description.trim() : '',
    textHtml: textHtml || '',
    file: fileName ? { name: fileName, data: fileData, type: fileType } : null,
    isAssignment: !!isAssignment,
    e_prova: isAssignment ? (e_prova === 'V' ? 'V' : 'F') : null,
    evaluationCode: isAssignment ? evaluationCode : null,
    startDate: startDate || null,
    endDate: endDate || null,
    authorName: authorName || null,
    authorEmail: authorEmail || null,
    createdAt: new Date().toISOString()
  };

  moduleObj.contents.push(newItem);
  saveCourses(courses);

  return res.status(200).json({ message: isAssignment ? 'Atividade publicada com sucesso!' : 'Conteúdo publicado com sucesso!', item: newItem });
});

// Atualizar conteúdo/atividade (Professor)
app.put('/api/courses/:courseId/modules/:moduleId/content/:contentId', verificarPermissao('Professor', 'Administrador'), (req, res) => {
  const { courseId, moduleId, contentId } = req.params;
  const { subject, description, textHtml, isAssignment, e_prova, evaluationCode, startDate, endDate } = req.body;

  const courses = loadCourses();
  const course = courses.find(c => c.id === courseId);
  if (!course) return res.status(404).json({ message: 'Curso não encontrado.' });

  const moduleObj = course.modules.find(m => m.id === moduleId);
  if (!moduleObj) return res.status(404).json({ message: 'Módulo não encontrado.' });

  const item = moduleObj.contents.find(i => i.id === contentId);
  if (!item) return res.status(404).json({ message: 'Item não encontrado.' });

  if (subject) item.subject = subject.trim();
  if (description !== undefined) item.description = description.trim();
  if (textHtml !== undefined) item.textHtml = textHtml;
  if (isAssignment !== undefined) item.isAssignment = !!isAssignment;
  if (item.isAssignment) {
    if (e_prova !== undefined) item.e_prova = e_prova === 'V' ? 'V' : 'F';
    if (evaluationCode !== undefined) item.evaluationCode = evaluationCode;
  } else {
    item.e_prova = null;
    item.evaluationCode = null;
  }
  if (startDate !== undefined) item.startDate = startDate;
  if (endDate !== undefined) item.endDate = endDate;

  saveCourses(courses);
  return res.status(200).json({ message: 'Atualizado com sucesso!' });
});

// Excluir conteúdo/atividade (Professor)
app.delete('/api/courses/:courseId/modules/:moduleId/content/:contentId', verificarPermissao('Professor', 'Administrador'), (req, res) => {
  const { courseId, moduleId, contentId } = req.params;
  const courses = loadCourses();
  const course = courses.find(c => c.id === courseId);
  if (!course) return res.status(404).json({ message: 'Curso não encontrado.' });

  const moduleObj = course.modules.find(m => m.id === moduleId);
  if (!moduleObj) return res.status(404).json({ message: 'Módulo não encontrado.' });

  moduleObj.contents = moduleObj.contents.filter(i => i.id !== contentId);
  saveCourses(courses);
  return res.status(200).json({ message: 'Excluído com sucesso!' });
});

// Enviar resposta de Atividade (Aluno)
app.post('/api/submissions', verificarPermissao('Aluno'), (req, res) => {
  const { courseId, moduleId, contentId, studentEmail, studentName, submissionHtml } = req.body;
  if (!contentId || !studentEmail) {
    return res.status(400).json({ message: 'Dados incompletos.' });
  }

  const courses = loadCourses();
  const course = courses.find(c => c.id === courseId);
  const mod = course ? course.modules.find(m => m.id === moduleId) : null;
  const ast = mod ? mod.contents.find(i => i.id === contentId) : null;

  const now = new Date();
  const deadlineEval = evaluateDeadlineServer(ast, now);

  if (deadlineEval.isClosed) {
    return res.status(400).json({ message: 'O prazo de envio desta avaliação já foi encerrado.' });
  }

  let subs = loadSubmissions();
  let existing = subs.find(s => s.contentId === contentId && s.studentEmail.toLowerCase() === studentEmail.toLowerCase());
  
  if (existing) {
    existing.submissionHtml = submissionHtml;
    existing.status = 'Sob análise';
    existing.fora_do_prazo = deadlineEval.fora_do_prazo;
    existing.submittedAt = now.toISOString();
    existing.updatedAt = now.toISOString();
  } else {
    subs.push({
      id: 'sub_' + Date.now(),
      courseId,
      moduleId,
      contentId,
      studentEmail: studentEmail.toLowerCase(),
      studentName: studentName || 'Aluno',
      submissionHtml: submissionHtml || '',
      status: 'Sob análise',
      fora_do_prazo: deadlineEval.fora_do_prazo,
      submittedAt: now.toISOString(),
      grade: null,
      createdAt: now.toISOString()
    });
  }

  saveSubmissions(subs);
  return res.status(200).json({ message: 'Atividade enviada com sucesso e sob análise!' });
});

// Obter submissões de atividades
app.get('/api/submissions', (req, res) => {
  const subs = loadSubmissions();
  return res.status(200).json({ submissions: subs });
});

// Registro público
app.post('/register', async (req, res) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ issues: result.error.issues });
  }

  const { name, email, password, role } = result.data;
  if (role === 'Administrador') {
    return res.status(403).json({
      issues: [{ path: ['role'], message: 'Novos administradores só podem ser criados por administradores autenticados.' }]
    });
  }

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
    assignedCourse: '',
    passwordHash: passwordHash,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers(users);
  return res.status(200).json({ message: 'Cadastro na Master Class realizado com sucesso!' });
});

// Criar usuário por Admin
app.post('/api/admin/create-user', verificarPermissao('Administrador'), async (req, res) => {
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
    assignedCourse: '',
    passwordHash: passwordHash,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers(users);
  return res.status(200).json({ message: `Conta de ${role} criada com sucesso pelo Administrador!` });
});

// Login
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
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar || '',
      assignedCourse: user.assignedCourse || ''
    }
  });
});

// Atualizar perfil
app.put('/api/profile', (req, res) => {
  const { email, name, avatar, assignedCourse } = req.body;
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
  if (assignedCourse !== undefined) {
    users[userIndex].assignedCourse = assignedCourse;
  }

  saveUsers(users);
  return res.status(200).json({
    message: 'Perfil atualizado com sucesso!',
    user: {
      name: users[userIndex].name,
      email: users[userIndex].email,
      role: users[userIndex].role,
      avatar: users[userIndex].avatar,
      assignedCourse: users[userIndex].assignedCourse
    }
  });
});

// Administração de Contas
app.get('/api/admin/users', verificarPermissao('Administrador'), (req, res) => {
  const { role } = req.query;
  const users = loadUsers();
  const filteredUsers = role ? users.filter(u => u.role.toLowerCase() === role.trim().toLowerCase()) : users;
  const safeUsers = filteredUsers.map(({ passwordHash, ...rest }) => rest);
  return res.status(200).json({ users: safeUsers });
});

app.put('/api/admin/users/:email', verificarPermissao('Administrador'), async (req, res) => {
  const targetEmail = decodeURIComponent(req.params.email).toLowerCase();
  const { name, email, role, password } = req.body;
  const users = loadUsers();
  const userIndex = users.findIndex(u => u.email.toLowerCase() === targetEmail);

  if (userIndex === -1) {
    return res.status(404).json({ message: 'Usuário não encontrado.' });
  }

  if (name) users[userIndex].name = name.trim();
  if (role) users[userIndex].role = role;
  if (email && email.toLowerCase() !== targetEmail) {
    const conflict = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (conflict) {
      return res.status(400).json({ message: 'Este novo e-mail já está em uso.' });
    }
    users[userIndex].email = email.toLowerCase();
  }
  if (password && password.trim() !== '') {
    users[userIndex].passwordHash = await bcrypt.hash(password, 10);
  }

  saveUsers(users);
  return res.status(200).json({ message: 'Conta atualizada com sucesso!' });
});

app.delete('/api/admin/users/:email', verificarPermissao('Administrador'), (req, res) => {
  const targetEmail = decodeURIComponent(req.params.email).toLowerCase();
  let users = loadUsers();
  const initialLength = users.length;
  users = users.filter(u => u.email.toLowerCase() !== targetEmail);

  if (users.length === initialLength) {
    return res.status(404).json({ message: 'Usuário não encontrado.' });
  }

  saveUsers(users);
  return res.status(200).json({ message: 'Conta excluída com sucesso!' });
});

// Esqueci minha senha
app.post('/forgot-password', async (req, res) => {
  const { email, newPassword, confirmNewPassword } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'O e-mail é obrigatório.' });
  }

  const users = loadUsers();
  const userIndex = users.findIndex(u => u.email.toLowerCase() === email.trim().toLowerCase());

  if (userIndex === -1) {
    return res.status(404).json({ message: 'Este e-mail não está cadastrado no sistema.' });
  }

  if (!newPassword) {
    return res.status(200).json({ exists: true, message: 'E-mail encontrado. Insira sua nova senha.' });
  }

  if (newPassword !== confirmNewPassword) {
    return res.status(400).json({ message: 'As senhas não coincidem.' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'A senha deve conter no mínimo 8 caracteres.' });
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!\%*?&]{8,}$/;
  if (!passwordRegex.test(newPassword)) {
    return res.status(400).json({ message: 'A senha deve conter maiúscula, minúscula, número e caractere especial (@$!%*?&).' });
  }

  users[userIndex].passwordHash = await bcrypt.hash(newPassword, 10);
  saveUsers(users);

  return res.status(200).json({ message: 'Senha redefinida com sucesso!' });
});

// Avisos
const AVISOS_FILE = path.join(__dirname, 'avisos.json');

function loadAvisos() {
  if (!fs.existsSync(AVISOS_FILE)) {
    const initialAvisos = [
      {
        id: 'aviso_1',
        subject: 'Bem-vindo ao Novo Semestre na Master Class!',
        description: 'Avisos importantes da diretoria acadêmica.',
        textHtml: '<p>Olá a todos os alunos e professores! Sejam muito bem-vindos.</p>',
        file: null,
        createdAt: new Date().toISOString()
      }
    ];
    fs.writeFileSync(AVISOS_FILE, JSON.stringify(initialAvisos, null, 2), 'utf-8');
    return initialAvisos;
  }
  try {
    return JSON.parse(fs.readFileSync(AVISOS_FILE, 'utf-8'));
  } catch (err) {
    return [];
  }
}

function saveAvisos(avisos) {
  fs.writeFileSync(AVISOS_FILE, JSON.stringify(avisos, null, 2), 'utf-8');
}

loadAvisos();

app.get('/api/avisos', (req, res) => {
  return res.status(200).json({ avisos: loadAvisos() });
});

app.post('/api/admin/avisos', verificarPermissao('Administrador'), (req, res) => {
  const { subject, description, textHtml, fileName, fileData, fileType } = req.body;
  if (!subject) return res.status(400).json({ message: 'Assunto obrigatório.' });

  const avisos = loadAvisos();
  const newAviso = {
    id: 'aviso_' + Date.now(),
    subject: subject.trim(),
    description: description ? description.trim() : '',
    textHtml: textHtml || '',
    file: fileName ? { name: fileName, data: fileData, type: fileType } : null,
    createdAt: new Date().toISOString()
  };

  avisos.unshift(newAviso);
  saveAvisos(avisos);
  return res.status(200).json({ message: 'Aviso publicado com sucesso!' });
});

app.delete('/api/admin/avisos/:id', verificarPermissao('Administrador'), (req, res) => {
  const avisoId = req.params.id;
  let avisos = loadAvisos();
  const initialLength = avisos.length;
  avisos = avisos.filter(av => av.id !== avisoId);

  if (avisos.length === initialLength) {
    return res.status(404).json({ message: 'Aviso não encontrado.' });
  }

  saveAvisos(avisos);
  return res.status(200).json({ message: 'Aviso excluído com sucesso!' });
});

// Notificações
app.get('/api/notifications', (req, res) => {
  const role = req.headers['x-user-role'];
  const courses = loadCourses();
  const avisos = loadAvisos();
  let notifications = [];

  avisos.forEach(av => {
    notifications.push({
      id: av.id,
      type: 'aviso',
      title: `Aviso: ${av.subject}`,
      description: av.description || 'Novo comunicado.',
      createdAt: av.createdAt
    });
  });

  if (role && role.toLowerCase() === 'aluno') {
    courses.forEach(c => {
      c.modules.forEach(m => {
        m.contents.forEach(cnt => {
          notifications.push({
            id: cnt.id,
            type: cnt.isAssignment ? 'atividade' : 'conteudo',
            title: `${cnt.isAssignment ? 'Nova Atividade' : 'Nova Matéria'} (${c.title}) - ${m.name}`,
            description: `Assunto: ${cnt.subject}`,
            createdAt: cnt.createdAt || new Date().toISOString()
          });
        });
      });
    });
  }

  notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return res.status(200).json({ notifications });
});

// Schema Zod para validação da nota (0.0 até 5.0)
const gradeSubmissionSchema = z.object({
  grade: z.union([z.string(), z.number(), z.null(), z.undefined()])
});

// Lançar ou atualizar nota de uma submissão (Professor)
app.put('/api/submissions/:subId/grade', verificarPermissao('Professor', 'Administrador'), (req, res) => {
  const { subId } = req.params;
  const parsedBody = gradeSubmissionSchema.safeParse(req.body);

  if (!parsedBody.success) {
    return res.status(400).json({ message: 'Formato de nota inválido.' });
  }

  const { grade } = parsedBody.data;
  const rawGradeStr = grade !== undefined && grade !== null ? String(grade).trim() : '';
  const hasGradeInput = rawGradeStr !== '';

  let validatedGrade = null;

  if (hasGradeInput) {
    const normalizedStr = rawGradeStr.replace(',', '.');
    const numericGrade = Number(normalizedStr);

    if (isNaN(numericGrade)) {
      return res.status(400).json({ message: 'Informe um valor numérico válido para a nota (0.0 até 5.0).' });
    }

    if (numericGrade < 0.0) {
      return res.status(400).json({ message: 'A nota mínima permitida é 0.0.' });
    }

    if (numericGrade > 5.0) {
      return res.status(400).json({ 
        message: 'As atividades e provas avaliativas têm nota máxima até 5.0.' 
      });
    }

    validatedGrade = numericGrade;
  }

  let subs = loadSubmissions();
  const sub = subs.find(s => s.id === subId);
  if (!sub) return res.status(404).json({ message: 'Submissão não encontrada.' });

  const graderName = req.body.gradedBy || null;
  const graderEmail = req.body.gradedByEmail || null;

  sub.grade = validatedGrade;
  sub.isEvaluated = validatedGrade !== null;
  sub.status = validatedGrade !== null ? 'Avaliado' : 'Sob análise';
  if (validatedGrade !== null) {
    sub.gradedBy = graderName;
    sub.gradedByEmail = graderEmail;
    sub.gradedAt = new Date().toISOString();
  }
  saveSubmissions(subs);

  return res.status(200).json({ message: 'Nota lançada com sucesso!', submission: sub });
});

// Endpoint preparado para o Boletim Escolar do Aluno e Avaliações Corrigidas
function syncExpiredSubmissionsForStudent(studentEmail, studentName = 'Aluno') {
  const courses = loadCourses();
  let subs = loadSubmissions();
  let modified = false;
  const now = new Date();

  courses.forEach(course => {
    course.modules.forEach(mod => {
      mod.contents.filter(c => c.isAssignment).forEach(ast => {
        const deadlineEval = evaluateDeadlineServer(ast, now);
        if (deadlineEval.isClosed) {
          const existing = subs.find(s => s.contentId === ast.id && s.studentEmail.toLowerCase() === studentEmail.toLowerCase());
          if (!existing) {
            subs.push({
              id: 'sub_exp_' + ast.id + '_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
              courseId: course.id,
              moduleId: mod.id,
              contentId: ast.id,
              studentEmail: studentEmail.toLowerCase(),
              studentName: studentName,
              submissionHtml: '',
              status: 'Encerrada sem envio',
              fora_do_prazo: 'V',
              isClosed: true,
              isEvaluated: true,
              submittedAt: null,
              grade: 0,
              createdAt: now.toISOString()
            });
            modified = true;
          }
        }
      });
    });
  });

  if (modified) {
    saveSubmissions(subs);
  }
  return subs;
}

app.get('/api/boletim/:studentEmail', (req, res) => {
  const targetEmail = decodeURIComponent(req.params.studentEmail).trim().toLowerCase();
  const courses = loadCourses();
  const users = loadUsers();
  const studentObj = users.find(u => u.email.toLowerCase() === targetEmail);
  const teachers = users.filter(u => u.role === 'Professor');
  const allSubs = syncExpiredSubmissionsForStudent(targetEmail, studentObj ? studentObj.name : 'Aluno');
  const subs = allSubs.filter(s => s.studentEmail.toLowerCase() === targetEmail);

  const boletim = courses.map(course => {
    const courseTeacher = teachers.find(t => t.assignedCourse === course.id);
    const defaultTeacherName = courseTeacher ? courseTeacher.name : 'Professor não vinculado';

    const modulesReport = course.modules.map(mod => {
      const slots = {
        Av1: null, Av2: null, Av3: null,
        At1: null, At2: null, At3: null
      };

      const correctedList = [];

      const assignments = mod.contents.filter(c => c.isAssignment);
      assignments.forEach(ast => {
        const sub = subs.find(s => s.contentId === ast.id);
        const deadlineEval = evaluateDeadlineServer(ast);
        const foraPrazoCode = sub && sub.fora_do_prazo ? sub.fora_do_prazo : deadlineEval.fora_do_prazo;

        let numericGrade = (sub && sub.grade !== null && sub.grade !== undefined && String(sub.grade).trim() !== '')
          ? parseFloat(String(sub.grade).replace(',', '.'))
          : null;

        let effectiveStatus = sub ? sub.status : 'Pendente';

        if (!sub && deadlineEval.isClosed) {
          numericGrade = 0;
          effectiveStatus = 'Encerrada sem envio';
        }

        const evalItem = {
          contentId: ast.id,
          moduleId: mod.id,
          moduleName: mod.name,
          subject: ast.subject,
          description: ast.description || '',
          e_prova: ast.e_prova,
          evaluationCode: ast.evaluationCode || null,
          startDate: ast.startDate || null,
          endDate: ast.endDate || null,
          submittedAt: sub ? (sub.submittedAt || sub.updatedAt || sub.createdAt) : null,
          fora_do_prazo: foraPrazoCode,
          status: effectiveStatus,
          grade: (numericGrade !== null && !isNaN(numericGrade)) ? numericGrade : null,
          professorName: (sub && sub.gradedBy) ? sub.gradedBy : (ast.authorName || defaultTeacherName)
        };

        if (ast.evaluationCode && Object.prototype.hasOwnProperty.call(slots, ast.evaluationCode)) {
          slots[ast.evaluationCode] = evalItem;
        }

        if (evalItem.grade !== null) {
          correctedList.push(evalItem);
        }
      });

      const validGrades = Object.values(slots)
        .filter(item => item && item.grade !== null)
        .map(item => item.grade);

      const media = validGrades.length > 0
        ? Number((validGrades.reduce((acc, val) => acc + val, 0) / validGrades.length).toFixed(2))
        : null;

      return {
        moduleId: mod.id,
        moduleName: mod.name,
        avaliacoes: slots,
        correctedItems: correctedList,
        mediaModulo: media
      };
    });

    return {
      courseId: course.id,
      courseTitle: course.title,
      courseDescription: course.description || '',
      professorName: defaultTeacherName,
      modules: modulesReport
    };
  });

  return res.status(200).json({ studentEmail: targetEmail, boletim });
});

app.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000');
});