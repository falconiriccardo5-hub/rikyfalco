# Immagine per la pubblicazione su un servizio cloud con disco persistente.
FROM node:22-alpine

WORKDIR /app
COPY package.json ./
COPY server.js ./
COPY src ./src
COPY public ./public
COPY scripts ./scripts

# I dati stanno sul volume montato, non nell'immagine.
ENV HOST=0.0.0.0 \
    PORT=4000 \
    DB_FILE=/var/data/fitmanager.db \
    BACKUP_DIR=/var/data/backup

EXPOSE 4000
CMD ["node", "server.js"]
