"""Sanity-check freshly downloaded data before it's committed (used by the weekly refresh).

Compares each file in public/data with the last committed version and fails if any of them
lost more than 20% of their features — a sign of a truncated or partial download rather than
real change on the ground. Prints a short summary either way.
"""
import json, subprocess, sys

FILES = ["places.geojson", "pv_sites.geojson", "pv_routes.geojson"]
MAX_DROP = 0.20

ok = True
for name in FILES:
    path = f"public/data/{name}"
    new = len(json.load(open(path))["features"])
    try:
        old_raw = subprocess.run(["git", "show", f"HEAD:{path}"], capture_output=True, check=True, text=True).stdout
        old = len(json.loads(old_raw)["features"])
    except subprocess.CalledProcessError:
        old = 0  # file is new; nothing to compare against
    change = f"{new - old:+d}" if old else "new"
    flag = ""
    if old and new < old * (1 - MAX_DROP):
        ok = False
        flag = f"  <-- dropped more than {int(MAX_DROP * 100)}%, refusing to commit"
    print(f"{name:20} {old:5} -> {new:5} ({change}){flag}")

sys.exit(0 if ok else 1)
