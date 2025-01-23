# Step 1: Use the official Bun image
FROM oven/bun:alpine AS base
WORKDIR /usr/src/app

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS install
RUN mkdir -p /temp/prod
COPY package.prod.json bun.lock /temp/prod/
RUN mv /temp/prod/package.prod.json /temp/prod/package.json
RUN --mount=type=cache,target=/root/.bun/install/cache cd /temp/prod && bun install


FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
COPY . .
COPY --from=install /temp/prod/node_modules node_modules

EXPOSE 3001
CMD ["bun", "run", "start:trpc"]