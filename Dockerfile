FROM nginx:alpine

# The page template lives in /app; the entrypoint copies it into the nginx
# web root and substitutes the API_BASE / API_TOKEN / ACCESS_CODE env vars
# at container start.
COPY index.html /app/index.html
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
