import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { config } from '../src/config.js';
import { DEFAULT_THEME, DEFAULT_SETTINGS, DEFAULT_SURVEY_SETTINGS } from '../src/lib/defaults.js';

const prisma = new PrismaClient();

// --- Sondeo de ejemplo: "Mis hábitos de aprendizaje" ---------------------
// Actividad de reflexión: hábito que frena / estrategias / red de apoyo.
const SURVEY = {
  slug: 'mis-habitos-de-aprendizaje',
  title: 'Mis hábitos de aprendizaje',
  description: 'Una actividad corta para reflexionar sobre lo que nos frena y cómo mejorar. No hay respuestas malas.',
  screens: [
    {
      text: '¿Qué hábito NO te deja alcanzar tus metas de aprendizaje? (puedes marcar varios)',
      type: 'MULTIPLE',
      allowOther: true,
      options: [
        { text: 'Dejar todo para el último momento', color: '#e11d48' },
        { text: 'Revisar el celular mientras estudio', color: '#f97316' },
        { text: 'Estudiar sin un plan ni horario', color: '#d97706' },
        { text: 'No preguntar cuando no entiendo', color: '#7c3aed' },
        { text: 'Leer sin subrayar ni resumir', color: '#0891b2' },
        { text: 'No descansar / estudiar cansado(a)', color: '#4338ca' },
      ],
    },
    {
      text: '¿Qué podrías empezar a hacer para superar ese hábito?',
      type: 'MULTIPLE',
      allowOther: true,
      options: [
        { text: 'Armar un horario semanal de estudio', color: '#16a34a' },
        { text: 'Estudiar en bloques cortos con pausas', color: '#0d9488' },
        { text: 'Silenciar el celular mientras estudio', color: '#2563eb' },
        { text: 'Repasar en voz alta o explicándole a alguien', color: '#7c3aed' },
        { text: 'Ir a las tutorías / preguntar al docente', color: '#c026d3' },
        { text: 'Estudiar con un compañero', color: '#ca8a04' },
      ],
    },
    {
      text: '¿Quién te puede apoyar para lograrlo?',
      type: 'MULTIPLE',
      allowOther: true,
      options: [
        { text: 'El o la docente', color: '#2563eb' },
        { text: 'Un compañero o compañera de clase', color: '#16a34a' },
        { text: 'Mi familia', color: '#f97316' },
        { text: 'Un tutor o monitor', color: '#7c3aed' },
        { text: 'Bienestar / consejería estudiantil', color: '#0891b2' },
      ],
    },
  ],
};

// --- Juego de ejemplo: "¿Qué aprendimos en el curso?" ---------------------
// 7 preguntas de verdadero/falso sobre motivación y hábitos de aprendizaje.
const FIRST_QUIZ = {
  slug: 'que-aprendimos-en-el-curso',
  title: '¿Qué aprendimos en el curso?',
  description: 'Responda verdadero o falso según corresponda.',
  questions: [
    {
      text: 'Motivación es lo que nos mueve, nos impulsa a actuar o ejecutar una actividad.',
      image: '/seed/q1-motivacion.jpg',
      timeLimit: 30,
      correct: true,
    },
    {
      text: 'La autoconfianza es la habilidad que te permite saber o conocer lo que puedes hacer.',
      timeLimit: 30,
      correct: true,
    },
    {
      text: 'No hace parte de los hábitos de aprendizaje el realizar un inventario de estudio o cronograma.',
      image: '/seed/q3-cronograma.png',
      timeLimit: 30,
      correct: false,
    },
    { text: 'Fijar metas nos ayuda a organizarnos.', timeLimit: 30, correct: true },
    {
      text: 'Una mentalidad emprendedora es la forma de pensar que mueve a buscar alternativas de solución ante las dificultades.',
      timeLimit: 30,
      correct: true,
    },
    {
      text: 'Al formular una meta y su ruta de acción es necesario analizar las alternativas e identificar los recursos disponibles.',
      timeLimit: 60,
      correct: true,
    },
    {
      text: 'La persona diligente o proactiva es la que busca alternativas y actúa para solucionar la situación problemática.',
      timeLimit: 60,
      correct: true,
    },
  ],
};

async function seedAdmin() {
  const { email, password, name } = config.seedAdmin;
  if (!email || !password) {
    console.log('[seed] SEED_ADMIN_EMAIL/PASSWORD no definidos, se omite el admin.');
    return;
  }
  const existing = await prisma.admin.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    console.log(`[seed] Admin ${email} ya existe.`);
    return;
  }
  await prisma.admin.create({
    data: {
      email: email.toLowerCase(),
      name,
      role: 'OWNER',
      passwordHash: await bcrypt.hash(password, 10),
    },
  });
  console.log(`[seed] Admin OWNER creado: ${email}`);
}

async function seedFirstQuiz() {
  const existing = await prisma.quiz.findUnique({ where: { slug: FIRST_QUIZ.slug } });
  if (existing) {
    console.log('[seed] El quiz inicial ya existe.');
    return;
  }
  const owner = await prisma.admin.findFirst({ where: { role: 'OWNER' } });
  await prisma.quiz.create({
    data: {
      slug: FIRST_QUIZ.slug,
      title: FIRST_QUIZ.title,
      description: FIRST_QUIZ.description,
      status: 'PUBLISHED',
      theme: DEFAULT_THEME,
      settings: { ...DEFAULT_SETTINGS, showTimer: true },
      createdById: owner?.id ?? null,
      questions: {
        create: FIRST_QUIZ.questions.map((q, i) => ({
          order: i,
          type: 'TRUE_FALSE',
          text: q.text,
          image: q.image ?? null,
          mediaType: q.image ? 'image' : 'none',
          timeLimit: q.timeLimit,
          points: 1000,
          pointsMode: 'STANDARD',
          options: {
            create: [
              { order: 0, text: 'Verdadero', isCorrect: q.correct === true },
              { order: 1, text: 'Falso', isCorrect: q.correct === false },
            ],
          },
        })),
      },
    },
  });
  console.log(`[seed] Quiz inicial creado: /${FIRST_QUIZ.slug} (${FIRST_QUIZ.questions.length} preguntas)`);
}

async function seedSurvey() {
  const existing = await prisma.quiz.findUnique({ where: { slug: SURVEY.slug } });
  if (existing) {
    console.log('[seed] El sondeo de ejemplo ya existe.');
    return;
  }
  const owner = await prisma.admin.findFirst({ where: { role: 'OWNER' } });
  await prisma.quiz.create({
    data: {
      slug: SURVEY.slug,
      type: 'SURVEY',
      title: SURVEY.title,
      description: SURVEY.description,
      status: 'PUBLISHED',
      theme: {
        ...DEFAULT_THEME,
        palette: {
          ...DEFAULT_THEME.palette,
          backgroundMode: 'color',
          background: '#f1f5f9',
          text: '#0f172a',
          primary: '#2563eb',
          card: '#ffffff',
          cardText: '#0f172a',
        },
        typography: { fontFamily: 'Nunito', headingScale: 1.15 },
      },
      settings: { ...DEFAULT_SURVEY_SETTINGS },
      createdById: owner?.id ?? null,
      questions: {
        create: SURVEY.screens.map((s, i) => ({
          order: i,
          type: s.type,
          text: s.text,
          mediaType: 'none',
          timeLimit: 0,
          points: 0,
          pointsMode: 'ZERO',
          allowOther: !!s.allowOther,
          options: {
            create: s.options.map((o, j) => ({
              order: j,
              text: o.text,
              color: o.color ?? null,
              isCorrect: false,
            })),
          },
        })),
      },
    },
  });
  console.log(`[seed] Sondeo de ejemplo creado: /${SURVEY.slug} (${SURVEY.screens.length} pantallas)`);
}

async function main() {
  await seedAdmin();
  await seedFirstQuiz();
  await seedSurvey();
}

main()
  .catch((err) => {
    console.error('[seed] Error:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
