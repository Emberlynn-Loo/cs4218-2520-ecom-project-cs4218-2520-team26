#!/bin/bash
# Emberlynn Loo, A0255614E

echo "=== RECOVERY TEST: Backend Restart ==="
echo "[$(date +%T)] Triggering server restart via nodemon..."

# Send restart signal to nodemon via touch only, no killing
touch server.js

echo "[$(date +%T)] Nodemon restart triggered."
echo "=== Monitor k6 output to observe recovery ==="