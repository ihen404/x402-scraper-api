FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --production

# Copy application source
COPY . .

# Expose port and set environment
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.js"]
