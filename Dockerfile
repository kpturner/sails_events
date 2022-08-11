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

RUN rm -rf ./config/local.*

RUN --mount=type=secret,id=localconfig \
  echo "Here is the config folder to start" && \
  ls ./config && \
  echo "what is this?" && \
  cat /run/secrets/localconfig && \
  echo "copying..." && \
  cp /run/secrets/localconfig ./config/local.js && \
  echo "Look here =======" && \
  cat ./config/local.js && \
  ls ./config && \
  echo "======================="

COPY ./assets/images/$assets/favicon.ico ./assets/

EXPOSE 1337

CMD [ "node", "app.js", "--prod"]
