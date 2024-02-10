# Setup and build the client

FROM node:18-alpine as client

WORKDIR /usr/app/client/
COPY client/package*.json ./
RUN npm install -qy
COPY client/ ./
RUN rm ./.env
RUN npm run build


# Setup the server

FROM node:18-alpine

WORKDIR /usr/app/
COPY --from=client /usr/app/client/build/ ./server/public/


WORKDIR /usr/app/server/
COPY .env ./.env

COPY server/package*.json ./
RUN npm install -qy
COPY server/ ./

ENV PORT ${BACKEND_PORT}

EXPOSE ${BACKEND_PORT}

CMD ["npm", "start"]
