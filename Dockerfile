# 1) Base: node (Debian slim) → gives us node, npm
FROM node:18-slim

# 2) Install Python3, pip, build tools, scientific deps, VMD build deps
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      python3 python3-pip python3-venv \
      build-essential cmake gfortran wget \
      tcl-dev tk-dev xorg-dev libglu1-mesa-dev freeglut3-dev \
      lammps openbabel libopenbabel-dev libatlas-base-dev ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# 3) Build & install VMD from your local source tree
COPY vmd-1.9.3 /tmp/vmd-1.9.3
RUN cd /tmp/vmd-1.9.3 && \
    ./configure LINUXAMD64 && \
    cd src && \
    make install && \
    rm -rf /tmp/vmd-1.9.3
ENV PATH="/usr/local/vmd/bin:${PATH}"

# 4) Install PM2 globally so we can run both processes
USER root
RUN rm -rf /.pm2 && ln -s /app/api/temp/.pm2 /.pm2
ENV PM2_HOME=/app/api/temp/.pm2
RUN npm install -g pm2

# 5) Bring in PM2 ecosystem file
COPY ecosystem.config.js /app/ecosystem.config.js

# 6) Prepare backend
COPY api/requirements.txt /app/api/requirements.txt
RUN pip3 install --break-system-packages --no-cache-dir -r /app/api/requirements.txt gunicorn

# 7) Prepare frontend deps
COPY frontend/package*.json /app/frontend/
RUN cd /app/frontend && npm install

# 8) Copy all source code
COPY api       /app/api
COPY frontend  /app/frontend
COPY ATLAS-toolkit /app/ATLAS-toolkit

# 9) Build the Next.js app
RUN cd /app/frontend && npm run build

# 10) Expose both ports
EXPOSE 3000 8000

# 11) Launch with PM2
WORKDIR /app
CMD ["pm2-runtime", "--pm2-home", "/app/api/temp/.pm2", "ecosystem.config.js", "--env", "production"]