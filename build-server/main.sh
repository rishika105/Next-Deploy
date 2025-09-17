#!/bin/bash

export GIT_REPOSITORY_URL = "$GIT_REPOSITORY_URL"

git clone "$GIT_REPOSITORY_URL" /home/app/output 

#cloned the repo provided by the user
exec node script.js
