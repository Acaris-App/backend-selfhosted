FROM oven/bun:1.3.14-alpine

WORKDIR /app

COPY src/package.json src/bun.lockb ./
RUN bun install --production --frozen-lockfile

COPY src/src ./src
COPY src/tsconfig.json ./tsconfig.json

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["bun", "run", "src/docs.ts"]
