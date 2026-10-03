#!/bin/sh
set -e

if [ "$(id -u)" = "0" ]; then
  mkdir -p /app/tmp
  chown node:node /app/tmp 2>/dev/null || true
  export HOME=/home/node
  exec setpriv --reuid=node --regid=node --init-groups "$@"
fi

exec "$@"
