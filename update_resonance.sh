#!/bin/bash

# Update Resonance Metrics Script
# Usage: ./update_resonance.sh [zenodo_views] [zenodo_downloads] [github_clones] [github_visitors]

VIEWS=${1:-90}
DOWNLOADS=${2:-80}
CLONES=${3:-414}
VISITORS=${4:-1}

echo "Updating Resonance Metrics..."
echo "ZENODO: $VIEWS views / $DOWNLOADS downloads"
echo "GITHUB: $CLONES clones / $VISITORS visitors"

curl -X POST http://localhost:8000/api/metrics/update \
     -H "Content-Type: application/json" \
     -H "X-Resonance-Key: REPLACED_BY_ENV" \
     -d "{
       \"zenodo_views\": $VIEWS,
       \"zenodo_downloads\": $DOWNLOADS,
       \"github_clones\": $CLONES,
       \"github_visitors\": $VISITORS
     }"

echo -e "\n\nResonance Spike Broadcasted to GENERATIVE MACHINE."
