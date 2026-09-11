FROM node:26-trixie-slim AS deps
WORKDIR /opt/app/mcpsevdesk
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS development
COPY tsconfig.json tsup.config.ts ./
COPY src ./src
ENV NODE_ENV=development
ENV MCPSEVDESK_HOST=0.0.0.0
ENV MCPSEVDESK_PORT=8080
EXPOSE 8080
USER node
CMD ["node", "src/index.ts", "http"]

FROM development AS build
USER root
RUN npm run build

FROM node:26-trixie-slim AS runtime
ENV NODE_ENV=production
WORKDIR /opt/app/mcpsevdesk
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build --chown=node:node /opt/app/mcpsevdesk/dist ./dist
RUN chown -R node:node /opt/app/mcpsevdesk
RUN mkdir -p /var/lib/mcp && chown node:node /var/lib/mcp
ENV MCPSEVDESK_HOST=0.0.0.0
ENV MCPSEVDESK_PORT=8080
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "mkdir -p /var/lib/mcp && chown -R node:node /var/lib/mcp && exec setpriv --reuid=node --regid=node --init-groups -- \"$@\"", "--"]
CMD ["node", "dist/index.js", "http"]
