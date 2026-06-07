FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

COPY backend/src ./src
COPY frontend ./frontend

ENV NODE_ENV=production
ENV PORT=8080
ENV DB_PATH=/data/devis.db
ENV FRONTEND_DIR=/app/frontend

EXPOSE 8080

CMD ["npm", "start"]
