FROM openjdk:11-jre-slim

LABEL maintainer OPAP-JP

COPY target/material-explorer.jar /opt/material-explorer/material-explorer.jar
WORKDIR /opt/material-explorer

CMD ["java", "--class-path", "material-explorer.jar", "jp.opap.material.MaterialExplorer"]
