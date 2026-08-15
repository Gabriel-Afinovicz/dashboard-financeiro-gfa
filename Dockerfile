# Imagem da API (o front-end é publicado no Vercel)
FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server ./server

EXPOSE 3001
CMD ["npm", "run", "start"]
