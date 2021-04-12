FROM nginx:1.19

LABEL maintainer OPAP-JP

# パッケージのインストール
RUN apt-get update \
    && apt-get install -y curl gnupg \
    && curl -sL https://deb.nodesource.com/setup_8.x | bash - \
    && apt-get install -y nodejs
RUN apt-get install -y npm
RUN npm install -g yarn

# 設定ファイルを配置します
COPY conf/nginx.conf /etc/nginx
COPY conf/mime.types /etc/nginx
COPY conf/default.conf /etc/nginx/conf.d

# アプリケーションのソースをコピーし、ビルドします
RUN mkdir /tmp/material-explorer
COPY package.json /tmp/material-explorer
WORKDIR /tmp/material-explorer
RUN yarn
COPY . /tmp/material-explorer

ARG service_host
ENV SERVICE_HOST="$service_host"
RUN yarn build

# アセットを配置します
RUN cp -R dist/* /usr/share/nginx/html

# ポート開放
EXPOSE 80

CMD "nginx"
