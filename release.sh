#!/usr/bin/env bash

set -o errexit
set -o pipefail
set -o nounset

# Run this script to build and push an updated image to docker hub.
# link: https://hub.docker.com/r/songadao/auction-bot

docker pull node:16

docker compose -f docker-compose.release.yml build

docker compose -f docker-compose.release.yml push
