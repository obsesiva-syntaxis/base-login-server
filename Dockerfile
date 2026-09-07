FROM node:20-alpine AS build

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY tsconfig*.json nest-cli.json ./
COPY src/ src/
RUN yarn build

FROM node:20-alpine

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production

COPY --from=build /app/dist ./dist

EXPOSE 3030

CMD ["node", "dist/main"]
