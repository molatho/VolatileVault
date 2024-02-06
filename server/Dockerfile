FROM node:18-alpine

WORKDIR /usr/app

COPY package*.json ./
RUN npm ci -qy

COPY . .

ENV BACKEND_PORT=${BACKEND_PORT}
