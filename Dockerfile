# Dockerfile for Next.js Frontend

# --- Build Stage ---
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies (using npm in this project)
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the Next.js application for standalone output
# Make sure next.config.ts has `output: "standalone"`
RUN npm run build

# --- Runner Stage ---
FROM node:18-alpine AS runner

WORKDIR /app

# Create a non-root user and switch to it
# The default Next.js standalone server runs as root, which is insecure.
# Creating a dedicated non-root user 'nextjs'
RUN addgroup --system nextjs && adduser --system --ingroup nextjs nextjs
USER nextjs

# Copy standalone output, public directory, and package.json from the builder stage
# The standalone output typically includes a server.js file and necessary node_modules.
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/package.json ./package.json

# Expose the port Next.js serves on
EXPOSE 3000

# Command to run the Next.js standalone server
CMD ["node", "server.js"]
