
import os
import time
import subprocess
import pyautogui

print("Starting verification run...")
# Launch the app
process = subprocess.Popen(["python", "main.py"], cwd=os.getcwd(), stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

# Wait for load - slightly longer to ensure UI builds
time.sleep(8)

# Read output (non-blocking if possible, but for this script we just poll)
# Note: Popen might buffer. We just kill and read.
process.terminate()

stdout, stderr = process.communicate()
print("STDOUT:", stdout)
print("STDERR:", stderr)

# Check for our specific error messages
if "Error loading banner" in stdout:
    print("BANNER LOAD FAILED")
if "Error loading icons" in stdout:
    print("ICON LOAD FAILED")
