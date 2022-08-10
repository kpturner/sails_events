#!/bin/bash

# Run docker-compose for this repo

set -e

function usage {
    echo "Usage: ./docker.sh"
    echo "--install            | -i   [Install docker]"
    echo "--project            | -o   [sails-events(default)]"
    echo "--config             | -c   [blank for default or pgl,csl,hamtun,mtsfc,pgsl]"
    echo "--port               | -p   [1337(default)]"
    echo "--file               | -f   [docker-compose.yml(default)]"
    echo "--action             | -a   ['up'(default), 'down']"
    echo "--update             | -u   [Fetch updated docker images]"
}

project="sails-events"
file="docker-compose.yml"
action="up -d"
update=""
port=1337
config="js"

while [[ "$#" -gt 0 ]]; do
    case $1 in
        -o|--project) project="$2"; shift ;;
        -c|--config) config="$2"; shift ;;
        -p|--port) port="$2"; shift ;;
        -f|--file) file="$2"; shift ;;
        -a|--action) action="$2"; shift ;;
        -i|--install install=1;;
        -u|--update) update=1;;
        *)
        echo "Unknown parameter passed: $1";
        usage;
        exit 1 ;;
    esac
    shift
done

if [[ $action == "up" ]]; then
    action="up -d"
fi

if [[ $action != "up -d" && $action != "down" ]]; then
    usage;
    exit 1;
fi

if [[ $config == '' ]]; then
    config=js
fi

if [[ $config != "pgl" && $config != "pgsl" && $config != "mtsfc" && $config != "csl" && $config != "hamtun" && $config != "js" ]]; then
    usage;
    exit 1;
fi

if [[ $update ]]; then
    echo Update Mode
    EVENTS_PORT=$port docker-compose  -p $project -f $file pull
fi

if [[ $install ]]; then
  echo "Installing docker"
  curl -fsSL get.docker.com | CHANNEL=stable sh
  sudo apt install docker-ce
  sudo apt-get install docker-ce docker-ce-cli containerd.io

  echo "Installing docker compose"
  sudo curl -L https://github.com/docker/compose/releases/download/1.29.2/docker-compose-`uname -s`-`uname -m` -o /usr/local/bin/docker-compose
  sudo chmod +x /usr/local/bin/docker-compose

  docker-compose --version

  systemctl enable --now docker
fi

# Run docker-compose
docker build --secret id=localconfig,src=./config/local.$config -t $project  .
EVENTS_PORT=$port docker-compose  -p $project -f $file $action
