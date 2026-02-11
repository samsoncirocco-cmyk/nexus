# backend/Dockerfile
# Use a slim Python base image
FROM python:3.9-slim-buster

# Set the working directory in the container
WORKDIR /app

# Install system dependencies if any (none explicitly listed for now, but good practice)
# RUN apt-get update && apt-get install -y --no-install-recommends 
#     build-essential 
#     && rm -rf /var/lib/apt/lists/*

# Copy requirements file and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Create a non-root user and switch to it
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser

# Expose the port the app runs on (e.g., 8000 for many Python web frameworks)
EXPOSE 8000

# Command to run the application (assuming run_local.py is the entry point)
# This might need adjustment based on the actual entry point of your backend application
CMD ["python", "execution/run_local.py"]
