# api/Dockerfile
FROM python:3.9-slim

# Create working directory
WORKDIR /app

# Copy requirements first to leverage caching
COPY requirements.txt /app/requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code
COPY . /app

# Expose port 8000 for the Flask backend
EXPOSE 8000

# By default, run Flask
# TODO: Gunicorn?
# TODO: Setup other software (LAMMPS, VMD, Obabel, ATLAS Toolkit, etc.)
CMD ["python", "api.py"]