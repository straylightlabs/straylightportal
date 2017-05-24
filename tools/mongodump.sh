#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
mongodump --db=straylightportal --username=$MONGO_DB_USER --password=$MONGO_DB_PASS --out="$DIR/../dumps/$(date +%s)"

