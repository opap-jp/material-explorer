.PHONY: build

build: target/material-explorer.jar

target/material-explorer.jar: rest/build.sbt rest/project/* $(shell find "rest/src")
	cd rest && sbt assembly
	@touch rest/target
