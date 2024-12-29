# syntax = docker/dockerfile:1.2

FROM node:16

ARG ASSETS=pgl
ARG OPTS=--prod

WORKDIR /usr/src/app

# Bundle app source
COPY . .

ENV OPTS=${OPTS}
ENV EVENTS_PORT=1337
ENV ALLOW_APP_UPDATE="0"

RUN npm install --legacy-peer-deps
RUN npm run build

# RUN apt-get update
# RUN apt-get install default-mysql-client -y

RUN apt-key adv --keyserver ha.pool.sks-keyservers.net --recv-keys 8C718D3B5072E1F5

RUN echo "deb http://repo.mysql.com/apt/debian/ buster mysql-8.0" > /etc/apt/sources.list.d/mysql.list

RUN apt-get update \
  && apt-get install -y mysql-community-client

RUN --mount=type=secret,id=SECRETS \
  cp /run/secrets/SECRETS ./config/local.js

RUN --mount=type=secret,id=DKIM_PRIVATE_KEY \
  cp /run/secrets/DKIM_PRIVATE_KEY ./dkim_private_key.pem

#RUN echo "Here are all the contents" && \
#  ls

#RUN echo "Here is the config folder to start" && \
#  ls ./config && \
#  echo "Look here =======" && \
#  cat ./config/local.js | sed 's/./& /g' && \
#  echo "======================="

RUN cp ./assets/images/${ASSETS}/favicon.ico ./assets/
RUN rm -rf ./.tmp

EXPOSE 1337

CMD node app.js ${OPTS}
