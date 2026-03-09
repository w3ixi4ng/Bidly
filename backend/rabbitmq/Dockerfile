FROM python:3.12-slim
WORKDIR /usr/src/app
COPY requirements.txt ./
RUN python -m pip install --no-cache-dir -r requirements.txt
COPY rabbitmq_setup.py ./
CMD [ "python", "./rabbitmq_setup.py" ]