FROM nginx:alpine

# The page template lives in /app; the entrypoint copies it into the nginx
# web root and substitutes the API_BASE env var at container start.
# Static assets (self-hosted fonts) are baked straight into the web root.
COPY index.html /app/index.html
COPY assets /usr/share/nginx/html/assets
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
