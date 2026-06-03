# ---------------------------------------------------------------
# Stage 1 — build the Voice of Beneficiaries Library bundle.
# esbuild bundles React + the app into a single self-contained file
# (no CDN). Output lands in /voices/dist.
# ---------------------------------------------------------------
FROM node:20-alpine AS voices
WORKDIR /voices
COPY voices/package.json ./
RUN npm install
COPY voices/ ./
RUN npm run build

# ---------------------------------------------------------------
# Stage 2 — static web server.
# The radar page template lives in /app; the entrypoint copies it
# into the nginx web root and substitutes the API_BASE env var at
# container start. Self-hosted fonts and the built library are baked
# straight into the web root (library served at /voices/).
# ---------------------------------------------------------------
FROM nginx:alpine
COPY index.html /app/index.html
COPY assets /usr/share/nginx/html/assets
COPY --from=voices /voices/dist /usr/share/nginx/html/voices
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
