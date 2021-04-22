FROM python:3.8-alpine

RUN apk add --no-cache imagemagick ghostscript

RUN mkdir /usr/src/im
WORKDIR /usr/src/im
COPY requirements.txt .
RUN pip install --upgrade pip \
    && pip install -r requirements.txt

COPY . .
RUN chmod 755 cmd.sh test.sh

CMD ["sh", "cmd.sh"]
