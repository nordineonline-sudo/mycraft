FROM nginx:alpine

# Copy site files into nginx html folder
COPY . /usr/share/nginx/html

# Expose default HTTP port
EXPOSE 80

# Run nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
