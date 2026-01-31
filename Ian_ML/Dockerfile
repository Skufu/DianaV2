# Python ML Server Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for scientific packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

# Copy requirements first for layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy ML code
COPY . .

# Set ownership and switch to non-root user
RUN chown -R appuser:appgroup /app
USER appuser

# Models are mounted as volume, but include defaults
# COPY ../models /app/models

EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

CMD ["python", "-m", "flask", "run", "--host=0.0.0.0", "--port=5000"]
