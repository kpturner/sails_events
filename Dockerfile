# syntax = docker/dockerfile:1.2

FROM node:10

ARG ASSETS=pgl

WORKDIR /usr/src/app

# Bundle app source
COPY . .

ENV NODE_ENV=production
ENV EVENTS_PORT=1337

RUN npm install
RUN npm run build

RUN --mount=type=secret,id=SECRETS \
  cp /run/secrets/SECRETS ./config/local.js

#RUN echo "Here are all the contents" && \
#  ls

#RUN echo "Here is the config folder to start" && \
#  ls ./config && \
#  echo "Look here =======" && \
#  cat ./config/local.js | sed 's/./& /g' && \
#  echo "======================="

RUN cp ./assets/images/$ASSETS/favicon.ico ./assets/

EXPOSE 1337

CMD [ "node", "app.js", "--prod"]
