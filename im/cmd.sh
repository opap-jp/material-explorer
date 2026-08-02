#!/bin/sh
gunicorn --chdir src --bind 0.0.0.0:9090 im:app
