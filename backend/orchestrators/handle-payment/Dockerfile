FROM python:3.12-slim
WORKDIR /usr/src/app
COPY requirements.txt ./
RUN python -m pip install --no-cache-dir -r requirements.txt
COPY main.py schema.py service.py ./
CMD [ "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8012" ]
