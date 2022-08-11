# syntax = docker/dockerfile:1.2

FROM node:10

ARG assets=pgl

WORKDIR /usr/src/app

# Bundle app source
COPY . .

ENV NODE_ENV=production
ENV EVENTS_PORT=1337

RUN npm install
RUN npm build

RUN --mount=type=secret,id=localconfig \
  cp /run/secrets/localconfig ./config/local.pgl

COPY ./assets/images/$assets/favicon.ico ./assets/

EXPOSE 1337

CMD [ "node", "app.js", "--prod"]
