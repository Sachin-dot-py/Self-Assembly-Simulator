# frontend/Dockerfile
FROM node:18-alpine

# Create an app directory
WORKDIR /app

# Copy only package.json and package-lock.json first for caching
COPY package*.json /app/

# Install dependencies
RUN npm install

# Copy the rest of the frontend code
COPY . /app

# Build the Next.js application
RUN npm run build

# Expose port 3000 to the outside
EXPOSE 3000

# Start the Next.js server
CMD ["npm", "run", "start"]