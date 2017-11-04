#!/usr/bin/env bash

set -e
set -x

running=$(docker ps -a --filter name=cloudinary-mock --format="{{.ID}}")
if [[ ${#running} -eq 0 ]]; then
    docker run -d -it -p 9080:9080 -p 9443:9443 -P --name cloudinary-mock cloudinary-mock
else
    docker start cloudinary-mock
fi

docker ps | grep cloudinary-mock

docker logs -f cloudinary-mock