.PHONY: build clean

build: rest/target/material-explorer.jar web/dist

clean:
	rm -rf rest/target web/{dist,node_modules}

rest/target/material-explorer.jar: rest/build.sbt rest/project/* $(shell find "rest/src")
	cd rest && sbt assembly

web/dist: web/node_modules $(shell find "web/src")
	cd web && yarn build
	@touch web/dist

web/node_modules: web/package.json web/yarn.lock
	cd web && yarn
	@touch web/node_modules
