---
title: 'Docker Deployment'
---

# Docker deployment
Kevin Turner Aug 2022

Square Events now builds docker images when PRs are merged with `main`or manually via `workflow-dispatch`.

If the repo is checked out on a machine with `docker` and `docker-compose` installed then the app can be started with (using PGL as an example).

What was the `config/local.js` for each instance is now stored in a [GitHub Actions Secret](https://github.com/kpturner/sails_events/settings/secrets/actions).

#### Production
`./docker.sh -a up -u -t pgl -p 1337`

#### Test
`./docker.sh -a up -u -t pgl_test -p 1338`


## Other details

The `-t` option indicates the tag of the docker image. So you can see the images here [packages](https://github.com/users/kpturner/packages/container/package/sails_events) where you can see that the image tag takes the form `<tag>-latest`.

The `-u` switch updates the local image from the repository. Obviously it can be left off if need be.

To stop the container run `./docker.sh -a down -t <tag>`

In order to use the command you have to login to `ghcr.io` using a PAT as a password - so you need permission to the `kpturner` repositories:
`docker login ghcr.io/kpturner`

## Software updates
When the image is built the contents of `gitupdate.sh` is overwritten to simply `docker login` and then `./docker.sh -a up -u -t <tag> -p <port>`

## Resources

Although the docker container has its own version of `node` and `redis` it still depends on `mysql` and its `database` being provided externally (usually through `Plesk`) as well as the email service provider.


## Services

Once docker is used for an instance its service should be stopped and disabled:  `sudo systemctl disable <SERVICE_NAME>`
