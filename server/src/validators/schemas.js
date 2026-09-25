import { z } from 'zod';

const hexColor = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Color hexadecimal inválido');

const imageRef = z
  .string()
  .max(2048)
  .refine(
    (v) => v === '' || v.startsWith('/') || /^https?:\/\//.test(v),
    'Debe ser una URL http(s) o una ruta relativa (/uploads/…, /seed/…)',
  );

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const adminCreateSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120),
  password: z.string().min(8).max(200),
  role: z.enum(['OWNER', 'EDITOR']).default('EDITOR'),
});

export const adminUpdateSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    password: z.string().min(8).max(200).optional(),
    role: z.enum(['OWNER', 'EDITOR']).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Nada que actualizar');

export const themeSchema = z
  .object({
    palette: z
      .object({
        backgroundMode: z.enum(['color', 'image', 'gradient']).default('color'),
        background: hexColor.default('#1e1b4b'),
        backgroundImage: imageRef.optional().or(z.literal('')),
        gradient: z.array(hexColor).min(2).max(3).default(['#4f46e5', '#9333ea']),
        text: hexColor.default('#ffffff'),
        primary: hexColor.default('#22c55e'),
        card: hexColor.default('#ffffff'),
        cardText: hexColor.default('#111827'),
      })
      .partial()
      .passthrough(),
    typography: z
      .object({
        fontFamily: z.string().max(60).default('Poppins'),
        headingScale: z.number().min(0.6).max(2).default(1),
      })
      .partial()
      .passthrough(),
    logo: imageRef.optional().or(z.literal('')),
    optionColors: z.array(hexColor).min(2).max(6).optional(),
    optionShapes: z.array(z.enum(['triangle', 'diamond', 'circle', 'square'])).optional(),
    answerLayout: z.enum(['grid', 'list']).optional(),
    showProgressBar: z.boolean().optional(),
    showTimer: z.boolean().optional(),
  })
  .partial()
  .passthrough();

export const settingsSchema = z
  .object({
    askNickname: z.boolean().default(true),
    nicknameLabel: z.string().max(60).optional(),
    showCorrectAtEnd: z.boolean().default(true),
    shuffleQuestions: z.boolean().default(false),
    shuffleAnswers: z.boolean().default(false),
    showProgressBar: z.boolean().default(true),
    showTimer: z.boolean().default(true),
    defaultTimeLimit: z.number().int().min(5).max(240).default(30),
    defaultPoints: z.number().int().min(0).max(10000).default(1000),
    // Sondeo
    acceptingResponses: z.boolean().optional(),
    resultsVisibility: z.enum(['admin', 'end', 'never']).optional(),
    closingMessage: z.string().max(500).optional(),
  })
  .partial()
  .passthrough();

export const quizCreateSchema = z.object({
  type: z.enum(['QUIZ', 'SURVEY', 'BALLOONS', 'BOTTLE', 'PIPES']).default('QUIZ'),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().or(z.literal('')),
  slug: z.string().max(80).optional(),
  coverImage: imageRef.optional().or(z.literal('')),
  theme: themeSchema.optional(),
  settings: settingsSchema.optional(),
});

export const quizUpdateSchema = quizCreateSchema.partial().extend({
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
});

const optionSchema = z.object({
  id: z.string().optional(),
  text: z.string().max(500).optional().or(z.literal('')),
  image: imageRef.optional().or(z.literal('')),
  color: hexColor.optional().or(z.literal('')),
  isCorrect: z.boolean().default(false),
});

export const questionSchema = z
  .object({
    type: z.enum(['SINGLE', 'MULTIPLE', 'TRUE_FALSE']).default('SINGLE'),
    text: z.string().min(1).max(1000),
    image: imageRef.optional().or(z.literal('')),
    mediaType: z.enum(['image', 'gif', 'none']).optional(),
    timeLimit: z.number().int().min(5).max(240).default(30),
    points: z.number().int().min(0).max(10000).default(1000),
    pointsMode: z.enum(['STANDARD', 'DOUBLE', 'ZERO']).default('STANDARD'),
    options: z.array(optionSchema).min(2).max(6),
  })
  .refine((q) => q.options.some((o) => o.isCorrect), {
    message: 'Debe haber al menos una opción correcta',
    path: ['options'],
  })
  .refine((q) => q.type !== 'SINGLE' || q.options.filter((o) => o.isCorrect).length === 1, {
    message: 'Una pregunta de opción única debe tener exactamente una respuesta correcta',
    path: ['options'],
  })
  .refine((q) => q.type !== 'TRUE_FALSE' || q.options.length === 2, {
    message: 'Verdadero/Falso debe tener exactamente 2 opciones',
    path: ['options'],
  });

// Globo: como una pregunta de Quiz (con respuesta correcta), pero sin tiempo ni
// puntos, y con color/velocidad propios para la animación.
export const balloonQuestionSchema = z
  .object({
    type: z.enum(['SINGLE', 'TRUE_FALSE']).default('SINGLE'),
    text: z.string().min(1).max(1000),
    image: imageRef.optional().or(z.literal('')),
    balloonColor: hexColor.default('#ef4444'),
    balloonSpeed: z.enum(['SLOW', 'MEDIUM', 'FAST']).default('MEDIUM'),
    options: z.array(optionSchema).min(2).max(6),
  })
  .refine((q) => q.options.some((o) => o.isCorrect), {
    message: 'Debe haber al menos una opción correcta',
    path: ['options'],
  })
  .refine((q) => q.type !== 'SINGLE' || q.options.filter((o) => o.isCorrect).length === 1, {
    message: 'Una pregunta de opción única debe tener exactamente una respuesta correcta',
    path: ['options'],
  })
  .refine((q) => q.type !== 'TRUE_FALSE' || q.options.length === 2, {
    message: 'Verdadero/Falso debe tener exactamente 2 opciones',
    path: ['options'],
  });

// Pantalla de un Sondeo: sin respuesta correcta, sin tiempo ni puntos.
export const surveyScreenSchema = z.object({
  type: z.enum(['SINGLE', 'MULTIPLE']).default('SINGLE'),
  text: z.string().min(1).max(1000),
  image: imageRef.optional().or(z.literal('')),
  allowOther: z.boolean().default(false),
  options: z
    .array(
      z.object({
        id: z.string().optional(),
        text: z.string().max(500).optional().or(z.literal('')),
        image: imageRef.optional().or(z.literal('')),
        color: hexColor.optional().or(z.literal('')),
      }),
    )
    .min(1)
    .max(8)
    .refine((opts) => opts.some((o) => (o.text && o.text.trim()) || (o.image && o.image.trim())), {
      message: 'Agrega al menos una opción con texto o imagen',
    }),
});

// Tuberías: como una pregunta de Quiz (con respuesta correcta), pero sin
// tiempo/puntos por pregunta — el color de cada tubo es el color de su opción.
export const pipesQuestionSchema = z
  .object({
    type: z.enum(['SINGLE', 'TRUE_FALSE']).default('SINGLE'),
    text: z.string().min(1).max(1000),
    image: imageRef.optional().or(z.literal('')),
    options: z.array(optionSchema).min(2).max(4),
  })
  .refine((q) => q.options.some((o) => o.isCorrect), {
    message: 'Debe haber al menos una opción correcta',
    path: ['options'],
  })
  .refine((q) => q.type !== 'SINGLE' || q.options.filter((o) => o.isCorrect).length === 1, {
    message: 'Una pregunta de opción única debe tener exactamente una respuesta correcta',
    path: ['options'],
  })
  .refine((q) => q.type !== 'TRUE_FALSE' || q.options.length === 2, {
    message: 'Verdadero/Falso debe tener exactamente 2 opciones',
    path: ['options'],
  });

// Botella: pregunta abierta + respuesta modelo a revelar, sin opciones ni tiempo/puntos.
export const bottleQuestionSchema = z.object({
  text: z.string().min(1).max(1000),
  image: imageRef.optional().or(z.literal('')),
  answerText: z.string().min(1).max(2000),
  // Opcional: si viene, la ruleta muestra dos respuestas (esta es la falsa).
  wrongAnswerText: z.string().max(2000).optional().or(z.literal('')),
});

export const reorderSchema = z.object({
  orderedIds: z.array(z.string()).min(1),
});

export const shareCreateSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export const startPlaySchema = z.object({
  nickname: z.string().trim().min(1).max(60).optional(),
});

export const answerSchema = z.object({
  questionId: z.string().min(1),
  selectedOptionIds: z.array(z.string()).max(8),
  otherText: z.string().trim().max(500).optional().or(z.literal('')),
  timeMs: z.number().int().min(0).max(1000 * 60 * 30).default(0),
});
