FROM node:24-alpine

RUN apk add --no-cache python3 py3-pip \
    && python3 -m pip install --no-cache-dir --break-system-packages pdfplumber

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 4000

CMD ["npm", "run", "start:dev"]
