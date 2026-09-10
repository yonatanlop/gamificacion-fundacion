import { createApp } from './app.js';
import { config } from './config.js';
import { prisma } from './db.js';

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`[gamificacion-fundacion] API escuchando en :${config.port} (${config.env})`);
});

async function shutdown(signal) {
  console.log(`\n[gamificacion-fundacion] ${signal} recibido, cerrando...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
