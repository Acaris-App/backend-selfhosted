FROM oven/bun:1.3.14-alpine

WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --production --frozen-lockfile

COPY src ./src
COPY tsconfig.json ./tsconfig.json

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["bun", "run", "src/docs.ts"]
