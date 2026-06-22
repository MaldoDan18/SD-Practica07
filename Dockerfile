FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3-tk \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY . /app

EXPOSE 5002 7000

CMD ["python", "servidor.py", "1", "--host", "0.0.0.0", "--port", "5002", "--no-gui", "--ticket-service-host", "ticketing_service", "--ticket-service-port", "7000"]