#!/bin/bash
# Start Dance Vision System

cd "$(dirname "$0")/vision-watcher"

echo "🕺 Starting Dance Vision System..."
echo ""

# Check if venv exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Run dance watcher
python3 dance_watcher.py
