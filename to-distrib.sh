#!/bin/bash

DEST=/home/server/aura
DIR=`pwd`

/etc/init.d/aura stop

cd $DEST
find . -maxdepth 1 -name "*" -type d \( -name db \) -prune -o -print | xargs rm -rf
cd $DIR

cp -r ./* $DEST

python sl.py $DEST

chown -R www-data:www-data $DEST

/etc/init.d/aura start
