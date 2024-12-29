# syntax = docker/dockerfile:1.4

FROM ubuntu:20.04

ARG ASSETS=pgl
ARG OPTS=--prod

WORKDIR /usr/src/app

# Bundle app source
COPY . .

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV OPTS=${OPTS}
ENV EVENTS_PORT=1337
ENV ALLOW_APP_UPDATE="0"

# Install dependencies
RUN apt-get update && apt-get install -y \
  wget curl gnupg lsb-release apt-transport-https && apt-get clean

# Add MySQL GPG key and repository
RUN wget https://repo.mysql.com/RPM-GPG-KEY-mysql-2022 \
  && gpg --dearmor -o /usr/share/keyrings/mysql-archive-keyring.gpg RPM-GPG-KEY-mysql-2022 \
  && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/mysql-archive-keyring.gpg] http://repo.mysql.com/apt/ubuntu/ focal mysql-8.0" > /etc/apt/sources.list.d/mysql.list

# Add NodeSource repository for Node.js 16
RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash -

# Install MySQL client and Node.js
RUN apt-get update && apt-get install -y mysql-client nodejs && apt-get clean

# Confirm installations
RUN mysql --version && node --version


RUN npm install --legacy-peer-deps
RUN npm run build

# RUN apt-get update
# RUN apt-get install default-mysql-client -y

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
