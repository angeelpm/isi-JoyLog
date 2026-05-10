FROM node:20-alpine
WORKDIR /usr/src/app

COPY package.json package-lock.json* ./
COPY services/api-gateway/package.json ./services/api-gateway/
COPY services/auth-service/package.json ./services/auth-service/
COPY services/library-service/package.json ./services/library-service/
COPY frontend/package.json ./frontend/

RUN npm install

EXPOSE 5173
