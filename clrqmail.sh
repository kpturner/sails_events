#!/bin/sh
# remove everything - STOP QMAIL FIRST!
/sbin/service qmail stop
for i in bounce info intd local mess remote todo; do
find /var/qmail/queue/$i -type f -exec rm {} \;
done
/sbin/service qmail start
