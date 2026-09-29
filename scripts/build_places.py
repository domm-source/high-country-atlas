"""Fetch named places in Victoria's High Country from OpenStreetMap (Overpass API)
and write data/places.geojson (map symbols + search box). Re-run any time to refresh."""
import json, urllib.request, urllib.parse

BBOX = (-37.9, 145.5, -36.1, 148.3)  # south, west, north, east
Q = """[out:json][timeout:180];
(
  node["place"~"^(city|town|village|hamlet|locality)$"]["name"]({b});
  node["natural"~"^(peak|saddle|waterfall|cave_entrance)$"]["name"]({b});
  nwr["tourism"~"^(alpine_hut|wilderness_hut|camp_site|viewpoint|attraction)$"]["name"]({b});
  nwr["amenity"="shelter"]["name"]({b});
  nwr["landuse"="winter_sports"]["name"]({b});
  nwr["boundary"~"^(national_park|protected_area)$"]["name"]({b});
  nwr["leisure"="nature_reserve"]["name"]({b});
  nwr["natural"="water"]["name"]({b});
  way["waterway"="river"]["name"]({b});
);
out center tags;""".format(b=",".join(map(str, BBOX)))

def kind(t):
    if "place" in t: return t["place"] if t["place"] in ("city","town","village") else "locality"
    n = t.get("natural")
    if n in ("peak","saddle","waterfall","cave_entrance"): return {"cave_entrance":"cave"}.get(n, n)
    if n == "water": return "lake"
    tr = t.get("tourism")
    if tr in ("alpine_hut","wilderness_hut") or t.get("amenity") == "shelter": return "hut"
    if tr == "camp_site": return "campsite"
    if tr == "viewpoint": return "lookout"
    if t.get("landuse") == "winter_sports": return "resort"
    if "boundary" in t or t.get("leisure") == "nature_reserve": return "park"
    if t.get("waterway") == "river": return "river"
    return "attraction"

MIRRORS = ["https://overpass.kumi.systems/api/interpreter",
           "https://overpass-api.de/api/interpreter",
           "https://maps.mail.ru/osm/tools/overpass/api/interpreter"]
for url in MIRRORS:
    try:
        req = urllib.request.Request(url, data=urllib.parse.urlencode({"data": Q}).encode(),
                                     headers={"User-Agent": "high-country-atlas/1.0"})
        els = json.load(urllib.request.urlopen(req, timeout=300))["elements"]
        break
    except Exception as ex:
        print("failed", url, ex)
else:
    raise SystemExit("all Overpass mirrors failed; try again later")

seen, out = set(), []
for e in els:
    t = e.get("tags", {})
    lat = e.get("lat") or e.get("center", {}).get("lat")
    lon = e.get("lon") or e.get("center", {}).get("lon")
    if lat is None: continue
    k = kind(t)
    key = (t["name"], k) if k in ("river", "park") else (t["name"], k, round(lat, 2), round(lon, 2))
    if key in seen: continue
    seen.add(key)
    p = {"n": t["name"], "k": k, "c": [round(lon, 5), round(lat, 5)]}
    ele = t.get("ele", "").replace("m", "").strip()
    if ele.replace(".", "").isdigit(): p["e"] = round(float(ele))
    out.append(p)

out.sort(key=lambda p: p["n"])
fc = {"type": "FeatureCollection", "features": [
    {"type": "Feature", "geometry": {"type": "Point", "coordinates": p.pop("c")}, "properties": p} for p in out]}
json.dump(fc, open("data/places.geojson", "w"), separators=(",", ":"), ensure_ascii=False)
from collections import Counter
print(len(out), "places", dict(Counter(p["k"] for p in out)))
