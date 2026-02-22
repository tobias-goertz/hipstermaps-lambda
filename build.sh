#!/bin/bash
# Build Lambda deployment package using AWS Lambda Node.js 20 image
docker run \
  --rm \
  -t \
  --platform linux/amd64 \
  --entrypoint "/bin/bash" \
  -v "$PWD":/var/task \
  public.ecr.aws/lambda/nodejs:20 -c \
  "rm -rf node_modules && npm install --production"
