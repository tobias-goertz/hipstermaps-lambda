# #!/bin/bash
docker run \
 --rm \
 -t \
 --entrypoint "/bin/bash" \
  -v "$PWD":/var/task \
  lambci/lambda:build-nodejs12.x -c -l \
   "rm -rf node_modules && npm install"

#docker run --rm -v "$PWD":/var/task lambci/lambda:build-nodejs8.10
