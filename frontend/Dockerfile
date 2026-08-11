FROM node:20-alpine

WORKDIR /app

# Evita que "next dev" se quede esperando el prompt de telemetría (sin TTY
# en el contenedor, ese prompt hace que el proceso termine solo con exit 0).
ENV NEXT_TELEMETRY_DISABLED=1

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0"]
