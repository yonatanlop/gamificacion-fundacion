import { Router } from 'express';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { avatarSchema, avatarUpdateSchema, speakSchema } from '../validators/schemas.js';

const router = Router();
router.use(requireAuth);

const ELEVEN = 'https://api.elevenlabs.io/v1';
const MODEL_ID = 'eleven_flash_v2_5';
const TTS_DIR = path.join(config.uploadDir, 'tts');

function requireKey() {
  if (!config.elevenLabsApiKey) {
    throw new HttpError(503, 'Falta configurar ELEVENLABS_API_KEY en el servidor para usar voces');
  }
  return config.elevenLabsApiKey;
}

async function elevenFetch(pathname, init = {}) {
  const res = await fetch(`${ELEVEN}${pathname}`, {
    ...init,
    headers: { 'xi-api-key': requireKey(), ...(init.headers || {}) },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new HttpError(502, `ElevenLabs respondió ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`);
  }
  return res;
}

// Lista cacheada en memoria: la cuenta gratuita tiene pocas voces y no cambian seguido.
let voicesCache = null;
let voicesCachedAt = 0;
const VOICES_TTL_MS = 60 * 60 * 1000;

router.get(
  '/voices',
  asyncHandler(async (req, res) => {
    if (!voicesCache || Date.now() - voicesCachedAt > VOICES_TTL_MS) {
      const data = await (await elevenFetch('/voices')).json();
      voicesCache = (data.voices || []).map((v) => ({
        id: v.voice_id,
        name: v.name,
        category: v.category || 'unknown',
        gender: v.labels?.gender || null,
        language: v.labels?.language || null,
        accent: v.labels?.accent || null,
      }));
      voicesCachedAt = Date.now();
    }
    res.json({ voices: voicesCache });
  }),
);

// Genera el audio de un texto con tiempos por carácter (para mover la boca).
// Cada combinación voz+texto se guarda en disco: repetir una frase NO gasta cuota.
router.post(
  '/speak',
  asyncHandler(async (req, res) => {
    const { text, voiceId } = speakSchema.parse(req.body);
    const key = createHash('sha256').update(`${voiceId}\n${MODEL_ID}\n${text}`).digest('hex');
    const audioPath = path.join(TTS_DIR, `${key}.mp3`);
    const alignPath = path.join(TTS_DIR, `${key}.json`);
    const url = `/uploads/tts/${key}.mp3`;

    if (fs.existsSync(audioPath) && fs.existsSync(alignPath)) {
      return res.json({ url, alignment: JSON.parse(fs.readFileSync(alignPath, 'utf8')), cached: true });
    }

    const data = await (
      await elevenFetch(`/text-to-speech/${encodeURIComponent(voiceId)}/with-timestamps?output_format=mp3_44100_128`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, model_id: MODEL_ID }),
      })
    ).json();

    const alignment = data.alignment || data.normalized_alignment;
    if (!data.audio_base64 || !alignment) throw new HttpError(502, 'ElevenLabs no devolvió audio con tiempos');

    fs.mkdirSync(TTS_DIR, { recursive: true });
    fs.writeFileSync(audioPath, Buffer.from(data.audio_base64, 'base64'));
    fs.writeFileSync(alignPath, JSON.stringify(alignment));
    res.json({ url, alignment, cached: false });
  }),
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const avatars = await prisma.avatar.findMany({
      where: { createdById: req.admin.id },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ avatars });
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = avatarSchema.parse(req.body);
    const avatar = await prisma.avatar.create({
      data: {
        name: data.name,
        config: data.config,
        script: data.script,
        voiceId: data.voiceId || null,
        createdById: req.admin.id,
      },
    });
    res.status(201).json({ avatar });
  }),
);

async function getOwnedOr404(id, adminId) {
  const avatar = await prisma.avatar.findFirst({ where: { id, createdById: adminId } });
  if (!avatar) throw new HttpError(404, 'Avatar no encontrado');
  return avatar;
}

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json({ avatar: await getOwnedOr404(req.params.id, req.admin.id) });
  }),
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    await getOwnedOr404(req.params.id, req.admin.id);
    const data = avatarUpdateSchema.parse(req.body);
    const patch = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.config !== undefined) patch.config = data.config;
    if (data.script !== undefined) patch.script = data.script;
    if (data.voiceId !== undefined) patch.voiceId = data.voiceId || null;
    const avatar = await prisma.avatar.update({ where: { id: req.params.id }, data: patch });
    res.json({ avatar });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await getOwnedOr404(req.params.id, req.admin.id);
    await prisma.avatar.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);

export default router;
