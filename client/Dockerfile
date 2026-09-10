# syntax=docker/dockerfile:1
# El bundle de Vite son archivos estáticos (no depende de la arquitectura),
# así que se compila SIEMPRE en la arquitectura del runner ($BUILDPLATFORM).
# Solo la imagen final de nginx se construye para la arquitectura destino.
FROM --platform=$BUILDPLATFORM node:20-alpine AS build
WORKDIR /app
ARG VITE_API_BASE=""
ENV VITE_API_BASE=$VITE_API_BASE
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=5s --retries=5 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
