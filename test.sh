#!/bin/bash
# Test Lambda function locally using AWS Lambda Node.js 20 image
docker run \
  --rm \
  --platform linux/amd64 \
  -v "$PWD":/var/task:ro,delegated \
  --env-file .env \
  public.ecr.aws/lambda/nodejs:20 \
  index.handler '{"formatSize": "2:3", "mapStyle": "shigawire/cjkqod0by7xsc2rpju6kvos0x", "lon": "7.617", "lat": "51.960", "bucketFile": "test_output.png", "title": "MÜNSTER", "subtitle": "GERMANY", "coords": "51° 57'"'"' 36\" N - 7° 37'"'"' 1\" E", "zoom": 14}'
