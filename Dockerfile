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

# Install dependencies for downloading and installing the MySQL APT config package
RUN apt-get update && apt-get install -y \
  wget \
  curl \
  dpkg \
  gnupg \
  lsb-release \
  && apt-get clean

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

RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
# Add NVM to the PATH by sourcing the NVM script
ENV NVM_DIR /root/.nvm
ENV NODE_VERSION 16

RUN . $NVM_DIR/nvm.sh && \
  nvm install $NODE_VERSION && \
  nvm use $NODE_VERSION && \
  nvm alias default $NODE_VERSION


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
