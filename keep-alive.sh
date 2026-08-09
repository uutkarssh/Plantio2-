#!/bin/bash
while true; do
  cd /home/z/my-project
  node node_modules/.bin/next dev -p 3000 -H 0.0.0.0 2>&1 | tee -a /home/z/my-project/dev.log
  echo "[$(date)] Server died, restarting in 3s..." >> /home/z/my-project/dev.log
  sleep 3
done
