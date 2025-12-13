# Python Worker Dockerfile with ROCm support for AMD GPU
# Use ROCm base image for AMD GPU acceleration
FROM rocm/dev-ubuntu-22.04:6.0 AS base

# Set environment variables for ROCm
ENV ROCM_PATH=/opt/rocm
ENV PATH=$ROCM_PATH/bin:$PATH
ENV LD_LIBRARY_PATH=$ROCM_PATH/lib:$LD_LIBRARY_PATH
ENV HSA_OVERRIDE_GFX_VERSION=10.3.0

# Install Python and system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.12 \
    python3.12-venv \
    python3-pip \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /usr/bin/python3.12 /usr/bin/python3 \
    && ln -sf /usr/bin/python3.12 /usr/bin/python

WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
# CTranslate2 with ROCm support for AMD GPUs
RUN pip3 install --no-cache-dir --upgrade pip && \
    pip3 install --no-cache-dir -r requirements.txt

# Copy worker code
COPY . .

# Create non-root user with UID 1001 (matches web container)
# Also need to be in render/video group for GPU access
RUN useradd --create-home --shell /bin/bash --uid 1001 worker && \
    usermod -aG video,render worker && \
    chown -R worker:worker /app

USER worker

CMD ["python", "main.py"]
