# 1. Use the official Playwright Node base image (comes pre-baked with Chromium system dependencies)
FROM mcr.microsoft.com/playwright:v1.60.0-jammy

# 2. Set the working directory inside the container
WORKDIR /usr/src/app

# 3. Copy package configurations
COPY package*.json ./

# 4. Install production and development dependencies
RUN npm ci

# 5. Copy the Prisma schema first to generate types
COPY prisma ./prisma/
RUN npx prisma generate

# 6. Copy the rest of the application code
COPY . .

# 7. Compile TypeScript to JavaScript
RUN npm run build

# 8. Expose the API server port
EXPOSE 5000

# 9. Execute Prisma migrations and start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
