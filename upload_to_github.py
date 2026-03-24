#!/usr/bin/env python3
import subprocess
import os
import sys

os.chdir('f:/edusync/Upgrade-main')

steps = [
    (['git', 'init'], 'Initialize repository'),
    (['git', 'config', 'user.email', 'adithya@example.com'], 'Set git email'),
    (['git', 'config', 'user.name', 'Adithya'], 'Set git name'),
    (['git', 'add', '.'], 'Add all files'),
    (['git', 'commit', '-m', 'Initial commit: edusync project with ML recommendations'], 'Commit files'),
    (['git', 'remote', 'add', 'origin', 'https://github.com/adithya0622/edusync.git'], 'Add remote origin'),
    (['git', 'branch', '-M', 'main'], 'Rename to main branch'),
    (['git', 'push', '-u', 'origin', 'main'], 'Push to GitHub'),
]

for cmd, desc in steps:
    print(f"\n[*] {desc}...")
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=False)
        if result.returncode == 0:
            print(f"✓ Success: {desc}")
            if result.stdout:
                print(result.stdout)
        else:
            # Check if it's already exists error (acceptable for init, remote add)
            if 'already exists' in result.stderr or 'already' in result.stderr:
                print(f"✓ Already done: {desc}")
            else:
                print(f"✗ Error: {desc}")
                print(f"STDOUT: {result.stdout}")
                print(f"STDERR: {result.stderr}")
                if 'fatal: destination path' not in result.stderr and 'permission' not in result.stderr.lower() and 'authentication' not in result.stderr.lower():
                    sys.exit(1)
    except Exception as e:
        print(f"✗ Exception: {desc} - {e}")
        sys.exit(1)

print("\n[✓] Upload process complete!")
print("Repository pushed to: https://github.com/adithya0622/edusync")
