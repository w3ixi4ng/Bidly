FROM python:3.12-slim
WORKDIR /usr/src/app
COPY requirements.txt ./
RUN python -m pip install --no-cache-dir -r requirements.txt
COPY main.py schema.py supabase_service.py redis_service.py rabbitmq_publish.py ./
CMD [ "python", "./main.py" ]