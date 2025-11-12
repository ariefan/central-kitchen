FROM nginx:alpine

# Copy custom nginx config
COPY apps/landing-page/nginx.conf /etc/nginx/conf.d/default.conf

# Copy static files
COPY apps/landing-page/index.html /usr/share/nginx/html/

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
