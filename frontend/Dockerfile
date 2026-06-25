# Stage 1 — build the React SPA
FROM node:20-alpine AS builder
WORKDIR /usr/src/app

COPY package.json package-lock.json* ./
COPY services/api-gateway/package.json ./services/api-gateway/
COPY services/auth-service/package.json ./services/auth-service/
COPY services/library-service/package.json ./services/library-service/
COPY services/ai-service/package.json ./services/ai-service/
COPY frontend/package.json ./frontend/

RUN npm install

COPY . .

# VITE_API_URL is baked into the JS bundle at build time
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build --workspace=joylog-frontend

# Stage 2 — serve the built assets with nginx
FROM nginx:alpine
COPY --from=builder /usr/src/app/frontend/dist /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
