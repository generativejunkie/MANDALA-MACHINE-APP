#!/bin/bash

# Load user environment to ensure node/npm are found in SSH sessions
source ~/.zshrc
source ~/.bashrc

# Set absolute path to project (Dynamic)
PROJECT_DIR="$HOME/Documents/GitHub/GENERATIVE-MACHINE"

# Navigate
cd "$PROJECT_DIR" || { echo "Project directory not found"; exit 1; }

# Start the server (Using npm from path or specific version if needed)
echo "Starting Antigravity System..."
# Attempt to find npm, fallback to standard path if needed, but avoid hardcoded user name.
if command -v npm &> /dev/null; then
    npm start
else
    # Fallback for NVM if not in path
    [ -s "$HOME/.nvm/nvm.sh" ] && \. "$HOME/.nvm/nvm.sh"
    npm start
fi
