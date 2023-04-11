#!/bin/bash

docker run --name local-mysql -p 52000:3306 -v ~/mysql/data/:/var/lib/mysql -e MYSQL_ROOT_PASSWORD=this-is-a-password -d mysql:latest
# The below volume mapping would be convenient but I cannot get the docker version of MySql to get permission to see the /usr/local/mysql/data symlink
# docker run --name local-mysql -p 52000:3306 -v /usr/local/mysql/data:/var/lib/mysql -d mysql:latest
