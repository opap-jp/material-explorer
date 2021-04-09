FROM openjdk:11-jre-slim

LABEL maintainer OPAP-JP

# ローケルを設定します
ENV LANG en_US.UTF-8
ENV LANGUAGE en_US:en
ENV LC_ALL en_US.UTF-8
RUN apt-get update \
    && apt-get -y install locales \
    && locale-gen en_US.UTF-8

COPY target/material-explorer.jar /opt/material-explorer/material-explorer.jar
WORKDIR /opt/material-explorer

CMD ["java", "-jar", "material-explorer.jar", "server", "config.yaml"]
