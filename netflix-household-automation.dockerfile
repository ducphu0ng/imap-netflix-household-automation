FROM mcr.microsoft.com/playwright:v1.51.1-jammy

WORKDIR /app

COPY package.json yarn.lock tsconfig.json ./
COPY src/ /app/src
RUN yarn install --frozen-lockfile --network-timeout 600000

CMD ["yarn", "start"]