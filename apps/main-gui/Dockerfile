# Build from the repository root: docker build -f apps/main-gui/Dockerfile .
ARG NODE_VERSION=24.21.0
FROM node:${NODE_VERSION}-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/main-gui/package.json apps/main-gui/package.json
# Limit installation to this workspace; the API has its own toolchain.
RUN npm ci --workspace main-gui --include-workspace-root=false --ignore-scripts --no-audit --no-fund

FROM dependencies AS development
ENV NODE_ENV=development
COPY apps/main-gui apps/main-gui
WORKDIR /app/apps/main-gui
EXPOSE 5173
CMD ["npm", "run", "dev"]

FROM dependencies AS build
COPY apps/main-gui apps/main-gui
RUN npm run build --workspace main-gui

# `vite preview` serves the bundle with the SPA fallback the router needs.
# It is a development convenience, not a production web server.
FROM dependencies AS runtime
ENV NODE_ENV=production
COPY apps/main-gui/vite.config.ts apps/main-gui/vite.config.ts
COPY --from=build --chown=node:node /app/apps/main-gui/dist apps/main-gui/dist
WORKDIR /app/apps/main-gui
USER node
EXPOSE 3000
CMD ["npm", "run", "start"]
