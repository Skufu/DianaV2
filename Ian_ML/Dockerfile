# Python ML Server Dockerfile
# Build context must be the repo root (not Ian_ML/) to access models/
FROM python:3.12-slim-bookworm

WORKDIR /app/Ian_ML

# Install system dependencies for scientific packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

# Copy requirements first for layer caching
COPY Ian_ML/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir gunicorn

# Copy ML code
COPY Ian_ML/ .

# Bake trained model files into the image (~22KB total)
COPY models/ /app/models/

# Set ownership and switch to non-root user
RUN mkdir -p /home/appuser && chown -R appuser:appgroup /app /home/appuser
USER appuser

ENV PYTHONPATH=/app
ENV FLASK_APP=Ian_ML.service.server
ENV MPLCONFIGDIR=/tmp/matplotlib
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--timeout", "120", "Ian_ML.service.server:app"]
