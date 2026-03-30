FROM php:8.2-apache

# Install MySQL extension and other common PHP extensions
RUN docker-php-ext-install mysqli pdo pdo_mysql

# Enable Apache mod_rewrite (useful for clean URLs)
RUN a2enmod rewrite

# Optional: Install additional useful extensions
# RUN docker-php-ext-install bcmath gd zip

# Optional: Set custom PHP configuration
# COPY php.ini /usr/local/etc/php/

# Set working directory
WORKDIR /var/www/html

# The volume mount in docker-compose.yml will override this directory
# but it's good practice to set it