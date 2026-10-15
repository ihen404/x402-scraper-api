FROM node:18-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

ENV PORT=8080
EXPOSE 8080

# Explicitly verify files and run server with node
CMD ["sh", "-c", "echo '=== CONTAINER STARTING ===' && pwd && ls -la && node server.js"]
