#!/bin/bash
# Move to project directory
cd "$(dirname "$0")"

echo "Starting Vision Watcher (Gesture Control)..."
echo "Press Ctrl+C to stop."

# Run python script using the virtual environment
./vision-watcher/venv/bin/python3 ./vision-watcher/watcher.py
