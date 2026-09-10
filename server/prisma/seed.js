import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { config } from '../src/config.js';
import { DEFAULT_THEME, DEFAULT_SETTINGS } from '../src/lib/defaults.js';

const prisma = new PrismaClient();

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

async function main() {
  await seedAdmin();
  await seedFirstQuiz();
}

main()
  .catch((err) => {
    console.error('[seed] Error:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
