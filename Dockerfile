FROM nginx:alpine

# The page template lives in /app; the entrypoint copies it into the nginx
# web root and substitutes the Supabase env vars at container start.
COPY index.html /app/index.html
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
