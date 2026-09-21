# Build from the repository root: docker build -f apps/main-api/Dockerfile .
ARG NODE_VERSION=24.21.0
FROM node:${NODE_VERSION}-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/main-api/package.json apps/main-api/package.json
# Limit installation to this workspace; the legacy GUI has its own toolchain.
RUN npm ci --workspace main-api --include-workspace-root=false --ignore-scripts --no-audit --no-fund

FROM dependencies AS development
ENV NODE_ENV=development
COPY apps/main-api apps/main-api
WORKDIR /app/apps/main-api
CMD ["npm", "run", "dev"]

FROM dependencies AS build
COPY apps/main-api apps/main-api
RUN npm run build --workspace main-api

FROM dependencies AS production-dependencies
RUN npm prune --omit=dev --workspace main-api --include-workspace-root=false --ignore-scripts --no-audit --no-fund

FROM node:${NODE_VERSION}-bookworm-slim AS runtime
ENV NODE_ENV=production API_PORT=3000
WORKDIR /app
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=production-dependencies --chown=node:node /app/apps/main-api ./apps/main-api
COPY --from=build --chown=node:node /app/apps/main-api/dist ./apps/main-api/dist
WORKDIR /app/apps/main-api
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3   CMD node -e "fetch('http://127.0.0.1:'+process.env.API_PORT+'/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
