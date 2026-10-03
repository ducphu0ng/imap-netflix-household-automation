FROM node:22-bookworm-slim

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

WORKDIR /app

COPY package.json yarn.lock ./
RUN apt-get update \
 && apt-get install -y --no-install-recommends tini \
 && yarn install --frozen-lockfile --non-interactive \
 && node_modules/.bin/playwright install --with-deps --only-shell chromium \
 && yarn cache clean \
 && rm -rf /var/lib/apt/lists/* /root/.cache

COPY tsconfig.json ./
COPY src ./src
RUN node_modules/.bin/tsc --noEmit

COPY --chmod=755 docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["/usr/bin/tini", "--", "docker-entrypoint.sh"]
CMD ["node_modules/.bin/tsx", "--import=extensionless/register", "src/index.ts"]
