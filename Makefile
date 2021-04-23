.PHONY: build

build: rest/target/material-explorer.jar

rest/target/material-explorer.jar: rest/build.sbt rest/project/* $(shell find "rest/src")
	cd rest && sbt assembly
