#!/bin/bash
docker run \
  --rm \
  -v "$PWD":/var/task \
  lambci/lambda:nodejs12.x index.handler '{"formatSize": "2:3", "mapStyle": "cjkqod0by7xsc2rpju6kvos0x", "lon": "7.617", "lat": "51.960", "bucketFile": "yoloswagger.png", "title": "Yoloswag", "zoom":"14"}'
