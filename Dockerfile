# Use the official Apache HTTP Server image
FROM httpd:2.4

# Copy your built website into the server's public folder
COPY ./dist/ /usr/local/apache2/htdocs/
