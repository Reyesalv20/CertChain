# ============================================================
# STAGE 1: compilar el contrato y generar el ABI (out/)
# ============================================================
FROM ghcr.io/foundry-rs/foundry:stable AS build
WORKDIR /app
# La imagen corre como usuario "foundry" (uid 1000) por defecto, pero COPY
# durante el build deja los archivos como root -> forge build no puede
# leerlos/escribir out/. Mismo fix que "deploy" en docker-compose.yml.
USER root
COPY contracts/src/ ./src/
COPY contracts/foundry.toml .
RUN forge build

# ============================================================
# STAGE 2: la imagen final con tu server Node
# ============================================================
FROM node:24-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/out/ ./out/

# Tu server (modular) y el entrypoint
COPY server.js ./
COPY src/ ./src/
COPY entrypoint.sh ./

EXPOSE 3000
CMD ["sh", "/app/entrypoint.sh"]
