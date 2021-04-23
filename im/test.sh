#!/bin/bash

coverage run -m unittest discover test
CODE=$?
coverage report
coverage xml
exit $CODE
