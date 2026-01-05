# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
# Copy source
COPY . .

# Install dependencies (after copy to ensure clean slate/fix arch issues)
# Force fresh install ignoring Mac-generated lockfile
RUN rm -f package-lock.json && npm install


# Build args for baking in env vars (if desired)
ARG VITE_API_KEY
ENV VITE_API_KEY=$VITE_API_KEY

# Build
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build artifacts
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port (Cloud Run defaults to 8080)
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
