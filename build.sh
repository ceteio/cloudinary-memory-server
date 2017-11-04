#!/usr/bin/env bash

set -e
set -x

docker build -t cloudinary-mock $@ $(dirname $0)