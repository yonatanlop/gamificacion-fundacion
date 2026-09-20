# Gamificaciones

Plataforma de juegos de preguntas y respuestas para crear actividades
gamificadas. Un administrador inicia sesión, gestiona los juegos (preguntas,
respuestas, imágenes, colores, textos — todo parametrizable) y comparte un link
público para jugar.

- **v1 (esta versión):** juego individual auto-ritmo. El jugador abre el link,
  (opcionalmente) escribe su apodo, responde las preguntas a su ritmo y ve su
  puntaje final con una revisión.
- **v2 (futuro):** modo en vivo con PIN, varios dispositivos y ranking en
  tiempo real. El modelo de datos ya está preparado (`GameSession.mode`, `pin`,
  `Player`, `PlayerAnswer`).

## Arquitectura

| Servicio | Tecnología | Rol |
|----------|-----------|-----|
| `db`     | PostgreSQL 16 | Base de datos |
| `server` | Node 20 + Express + Prisma | API REST (`/api/*`), archivos subidos (`/uploads/*`) y librería de íconos (`/icons/*`) |
| `gamificaciones-web` | React + Vite + Tailwind servido por nginx | UI + reverse proxy hacia `server` |

```
client/   → SPA de React (panel admin + juego)
server/   → API, Prisma, seed
docker-compose.yml       → db + server + gamificaciones-web
docker-compose.prod.yml  → overlay opcional con Caddy (HTTPS automático)
```

## Puesta en marcha (local)

Requisitos: Docker + Docker Compose.

```bash
cp .env.example .env
# edita .env: contraseñas, JWT_SECRET (openssl rand -hex 32), SEED_ADMIN_*
docker compose up -d --build
```

- Aplicación: <http://localhost:8080>
- Panel admin: <http://localhost:8080/login> (credenciales `SEED_ADMIN_*`)
- Primer juego ya sembrado: <http://localhost:8080/play/que-aprendimos-en-el-curso>

El contenedor `server` ejecuta al arrancar: `prisma db push` (sincroniza el
esquema), `prisma/seed.js` (crea el admin OWNER y el primer juego si no existen)
y luego la API.

## Desarrollo sin Docker

```bash
# 1. Base de datos (puedes usar la de Docker)
docker compose up -d db

# 2. Backend
cd server
cp ../.env .env   # y ajusta DATABASE_URL a ...@localhost:5432/...
npm install
npx prisma db push
npm run seed
npm run dev        # http://localhost:4000

# 3. Frontend
cd ../client
npm install
npm run dev        # http://localhost:5173 (proxy /api -> :4000)
```

## Pruebas

```bash
cd server && npm test        # scoring + sanitización (no fuga de respuestas)
```

## Variables de entorno

Ver `.env.example`. Las más importantes:

| Variable | Descripción |
|----------|-------------|
| `JWT_SECRET` | Secreto para firmar tokens. **Obligatorio**, usa algo aleatorio y largo. |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Primer administrador (rol OWNER). |
| `DATABASE_URL` | Cadena de conexión a PostgreSQL. |
| `UPLOAD_DIR` | Carpeta de imágenes subidas (volumen `uploads`). |
| `MAX_UPLOAD_MB` | Tamaño máximo por imagen (default 5). |
| `CORS_ORIGIN` | Orígenes permitidos (solo necesario en desarrollo separado). |
| `PUBLIC_BASE_URL` | URL pública, para construir el link de juego. |
| `WEB_PORT` | Puerto expuesto por nginx (default 8080). |

## Construcción de imágenes (GitHub Actions)

El workflow `.github/workflows/build-images.yml` construye y publica dos imágenes
multi-arquitectura (amd64 + **arm64**, para la VM Ampere de Oracle) en GitHub
Container Registry en cada push a `main`:

- `ghcr.io/yonatanlop/gamificacion-fundacion-server`
- `ghcr.io/yonatanlop/gamificacion-fundacion-web`

Tags: `latest` (rama por defecto), `sha-<commit>` y `vX.Y.Z` (al crear un tag).

**Una sola vez**, tras el primer run del workflow: en GitHub → *Packages* →
cada paquete → *Package settings* → **Change visibility → Public**. Así la VM
descarga las imágenes sin autenticarse. (Alternativa: en la VM
`echo <PAT> | docker login ghcr.io -u yonatanlop --password-stdin` con un PAT de
solo lectura de paquetes.)

## Despliegue en Oracle Cloud (free tier, VM ARM Ampere)

1. **Crear la instancia**: *Compute → Instances → Create*. Imagen Oracle Linux 9
   o Ubuntu 22.04, shape `VM.Standard.A1.Flex` (ARM, incluido en el free tier).
   Guarda la clave SSH.

2. **Abrir puertos**: en la *VCN → Security List* de la subred, añade reglas de
   ingreso para TCP **80** y **443** desde `0.0.0.0/0`.

3. **Instalar Docker** (Oracle Linux 9):

   ```bash
   sudo dnf install -y dnf-plugins-core
   sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
   sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
   sudo systemctl enable --now docker
   sudo usermod -aG docker $USER && newgrp docker
   ```

4. **Firewall del SO** (además de la Security List):

   ```bash
   sudo firewall-cmd --permanent --add-service=http
   sudo firewall-cmd --permanent --add-service=https
   sudo firewall-cmd --reload
   ```

5. **Desplegar** (usa las imágenes de ghcr.io, no compila nada en la VM):

   ```bash
   git clone https://github.com/yonatanlop/gamificacion-fundacion.git
   cd gamificacion-fundacion
   cp .env.example .env && nano .env      # secretos + PUBLIC_BASE_URL
   docker compose -f docker-compose.deploy.yml pull
   docker compose -f docker-compose.deploy.yml up -d
   ```

   Con HTTPS automático (Caddy + Let's Encrypt):

   1. Abre el **puerto 443** en la Security List de OCI (igual que el 80).
   2. Consigue un dominio que apunte a la IP. Gratis y sin registro con
      **sslip.io**: si la IP es `149.118.61.207`, el dominio es
      `149-118-61-207.sslip.io` (ya resuelve solo).
   3. En `.env`:
      ```
      CADDY_DOMAIN=149-118-61-207.sslip.io
      PUBLIC_BASE_URL=https://149-118-61-207.sslip.io
      ```
   4. Levanta con el overlay:
      ```bash
      docker compose -f docker-compose.deploy.yml -f docker-compose.prod.yml up -d
      ```
   Caddy obtiene el certificado en el primer arranque (challenge por el puerto 80)
   y a partir de ahí sirve HTTPS en el 443, renovando solo.

6. **Actualizar** a la última versión publicada:

   ```bash
   cd gamificacion-fundacion && git pull
   docker compose -f docker-compose.deploy.yml pull
   docker compose -f docker-compose.deploy.yml up -d
   ```

> Para levantar todo **compilando localmente** (sin ghcr), usa el
> `docker-compose.yml` en lugar de `docker-compose.deploy.yml`.

### Copias de seguridad

```bash
# Base de datos
docker compose -f docker-compose.deploy.yml exec db \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup_$(date +%F).sql
# Imágenes subidas (el nombre exacto del volumen lo da `docker volume ls`,
# normalmente <carpeta>_uploads)
docker run --rm -v "$(basename "$PWD" | tr 'A-Z' 'a-z')_uploads":/data -v "$PWD":/backup alpine \
  tar czf /backup/uploads_$(date +%F).tgz -C /data .
```

## API (resumen)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/auth/login` | — | Login, devuelve JWT |
| GET | `/api/auth/me` | JWT | Admin actual |
| GET/POST | `/api/admins` | JWT (OWNER para POST) | Gestión de administradores |
| GET/POST | `/api/quizzes` | JWT | Listar / crear juegos |
| GET/PATCH/DELETE | `/api/quizzes/:id` | JWT | Detalle / editar / borrar |
| POST | `/api/quizzes/:id/publish` \| `/unpublish` \| `/duplicate` | JWT | Estado del juego |
| POST | `/api/quizzes/:id/questions` | JWT | Añadir pregunta |
| POST | `/api/quizzes/:id/reorder-questions` | JWT | Reordenar |
| PATCH/DELETE | `/api/questions/:id` | JWT | Editar / borrar pregunta |
| POST | `/api/uploads` | JWT | Subir imagen (multipart `file`) |
| GET | `/api/quizzes/:id/results` | JWT | Partidas y puntajes |
| GET | `/api/play/:slug` | — | Juego público (sin respuestas correctas) |
| POST | `/api/play/:slug/start` | — | Iniciar partida |
| POST | `/api/play/sessions/:id/answer` | — | Responder una pregunta |
| POST | `/api/play/sessions/:id/finish` | — | Finalizar y ver resumen |
| GET | `/api/icons/manifest` | — | Índice de íconos para el buscador del picker |
| GET | `/icons/:set/:name.svg` | — | Ícono SVG personalizado (`?color=&stroke=&size=&hue=&mono=`) |

## Librería de íconos

Al editar la imagen de una pregunta, opción, portada o el logo del tema, el
botón **"Elegir ícono"** abre un buscador con miles de íconos SVG gratuitos.
También hay una sección aparte en el menú (**Íconos**, `/admin/iconos`) para
buscar, personalizar y descargar sin tener que entrar a una pregunta.

Dos familias por estilo, todas con licencia permisiva (uso, modificación y
redistribución sin atribución obligatoria — a diferencia de la mayoría de
assets de Flaticon, que exigen atribución o licencia paga):

| Set | Licencia | Cantidad | Estilo |
|---|---|---|---|
| [Tabler Icons](https://tabler.io/icons) | MIT | ~5.100 | Línea, un solo color — **recoloreable** |
| [Lucide](https://lucide.dev) | ISC | ~1.500 | Línea, un solo color — **recoloreable** |
| [Fluent Emoji](https://github.com/microsoft/fluentui-emoji) (estilo Flat) | MIT | ~1.600 | Emoji a todo color — color fijo |
| [Noto Emoji](https://github.com/googlefonts/noto-emoji) | Apache-2.0 | ~1.900 | Emoji a todo color — color fijo |

- Los sets de línea (Tabler/Lucide) se pueden recolorear (color exacto) y
  ajustar el grosor. Los de emoji a color (Fluent/Noto) traen varios tonos
  fijos por ícono, así que un control de "un solo color" no aplicaría igual;
  en su lugar el picker ofrece:
  - **Tono**: gira toda la paleta (`feColorMatrix hueRotate` dentro del SVG)
    conservando sombras y brillos — `?hue=180`.
  - **Silueta de un color**: convierte el ícono en una silueta plana de un
    color exacto, usando su propia forma como máscara de alfa — `?mono=%23ff0000`.
  - Ambos efectos quedan horneados en el SVG devuelto (no son solo CSS), así
    que también se ven al descargar el archivo. El picker muestra el control
    que corresponde según `recolorable` en el manifest. El tamaño es ajustable
    siempre.
- Se importan una sola vez con `scripts/import-icons.mjs` (usa los paquetes
  npm `@tabler/icons`, `lucide-static`, `@iconify-json/fluent-emoji-flat` y
  `@iconify-json/noto`) y quedan **committeados** en `server/assets/icons/`
  (~16 MB, ~10.150 íconos) — no hay llamadas a servicios externos en
  producción. Se descartan las variantes de tono de piel de los emoji: se
  detectan comparando contra el ícono "base" sin sufijo de tono (cada set las
  nombra distinto — Noto: `...-light-skin-tone`, Fluent: `...-light` — así que
  no se usa una lista fija de sufijos).
- Cada ícono es editable al elegirlo: color, grosor de línea y tamaño (se
  aplican como parámetros de la URL, p. ej.
  `/icons/tabler/home.svg?color=%232563eb&stroke=1.5&size=48`), así que se
  guarda y funciona igual que cualquier otra imagen subida.
- **Búsqueda en español**: `client/src/lib/iconSynonyms.js` traduce términos
  comunes (casa, bombillo, fiesta, hábito…) a las palabras clave en inglés que
  usan los sets, ya que sus nombres y etiquetas originales están en inglés.
- Para sumar más íconos o sets más adelante: agregar el paquete npm en
  `scripts/`, ajustar `import-icons.mjs` y volver a ejecutarlo.

## Juego de ejemplo

`server/prisma/seed.js` crea el juego **"¿Qué aprendimos en el curso?"**
(7 preguntas de verdadero/falso sobre motivación y hábitos de aprendizaje) y
queda publicado en `/play/que-aprendimos-en-el-curso`. Las imágenes de ejemplo
están en `client/public/seed/`.
