# ✅ Alpine: ~200MB vs node:18 full ~1GB — build & deploy lebih cepat
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# ✅ --omit=dev: tidak install devDependencies (nodemon dll) di production
RUN npm install --omit=dev

COPY . .

# ✅ DIHAPUS: EXPOSE 3000 — Cloud Run inject PORT otomatis, tidak perlu expose manual

CMD ["node", "src/app.js"]
