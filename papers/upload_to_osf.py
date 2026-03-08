import os
import requests

# --- CONFIGURATION (Please provide these) ---
OSF_PROJECT_ID = "zhr35"
OSF_TOKEN = "REMOVED_FOR_SECURITY"
# --------------------------------------------

import os
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
PAPERS_DIR = PROJECT_ROOT

FILES_TO_UPLOAD = [
    "GJ-X-010-Academic-JP.md",
    "GJ-X-010-Academic.md",
    "GJ-X-010-Academic.pdf",
    "GJ-X-010-Academic.tex"
]

def upload_file(file_path, project_id, token):
    file_name = os.path.basename(file_path)
    # Waterbutler API endpoint for OSF Storage
    url = f"https://files.osf.io/v1/resources/{project_id}/providers/osfstorage/?name={file_name}&kind=file"
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    with open(file_path, 'rb') as f:
        response = requests.put(url, headers=headers, data=f)
    
    if response.status_code == 201:
        print(f"✅ Successfully uploaded: {file_name}")
    elif response.status_code == 200:
        print(f"✅ Successfully updated: {file_name}")
    else:
        print(f"❌ Failed to upload {file_name}: {response.status_code}")
        print(response.text)

if __name__ == "__main__":
    if OSF_PROJECT_ID == "YOUR_PROJECT_ID" or OSF_TOKEN == "YOUR_PERSONAL_ACCESS_TOKEN":
        print("Error: Please set OSF_PROJECT_ID and OSF_TOKEN in the script.")
    else:
        for file_name in FILES_TO_UPLOAD:
            file_path = os.path.join(PAPERS_DIR, file_name)
            if os.path.exists(file_path):
                print(f"Uploading {file_name}...")
                upload_file(file_path, OSF_PROJECT_ID, OSF_TOKEN)
            else:
                print(f"File not found: {file_path}")
