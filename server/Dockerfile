# Be More API — one container, SQLite on a volume at /data
FROM node:22-alpine
WORKDIR /app
COPY server/package.json server/package-lock.json server/.npmrc ./server/
RUN cd server && npm ci --omit=dev --no-audit --no-fund
COPY shared ./shared
COPY server/src ./server/src
ENV NODE_ENV=production PORT=8787 DB_PATH=/data/bemore.sqlite
VOLUME ["/data"]
EXPOSE 8787
WORKDIR /app/server
CMD ["node", "--no-warnings=ExperimentalWarning", "src/index.ts"]
