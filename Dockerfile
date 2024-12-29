# syntax = docker/dockerfile:1.4

ARG NODE_VERSION=16
ARG ASSETS=pgl
ARG OPTS=--prod

FROM node:${NODE_VERSION} as node

FROM ubuntu:20.04

# Install dependencies for MySQL client and node binaries
RUN apt-get update && apt-get install -y \
  wget \
  dpkg \
  gnupg \
  lsb-release \
  libstdc++6 \
  && apt-get clean

# Copy Node.js binaries and libraries from the node image
COPY --from=node /usr/lib /usr/lib
COPY --from=node /usr/local/lib /usr/local/lib
COPY --from=node /usr/local/include /usr/local/include
COPY --from=node /usr/local/bin /usr/local/bin

RUN node -v

WORKDIR /usr/src/app

# Bundle app source
COPY . .

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV OPTS=${OPTS}
ENV EVENTS_PORT=1337
ENV ALLOW_APP_UPDATE="0"

# Download the MySQL APT config package
RUN wget https://dev.mysql.com/get/mysql-apt-config_0.8.29-1_all.deb

# Install the MySQL APT config package
RUN dpkg -i mysql-apt-config_0.8.29-1_all.deb

# Update the package list and install MySQL client
RUN apt-get update && apt-get install -y mysql-client && apt-get clean

# Clean up unnecessary files to keep the image size small
RUN rm -rf mysql-apt-config_0.8.29-1_all.deb

# Confirm installations
RUN mysql --version

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
