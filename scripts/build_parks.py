"""Download Parks Victoria recreation sites (campgrounds, picnic areas) and official
walks / drives from the Vicmap open data service, and write compact GeoJSON for the map:

  public/data/pv_sites.geojson   points, with facilities, description and directions
  public/data/pv_routes.geojson  simplified lines, with distance, time, grade and description

It also removes OpenStreetMap campsites from public/data/places.geojson that sit within 300 m
of a Parks Victoria campground, so the map doesn't show the same campground twice.
Run it after scripts/build_places.py.

Data © State of Victoria (DEECA / Parks Victoria), CC BY 4.0.
"""
import json, math, re, urllib.parse, urllib.request

WFS = "https://opendata.maps.vic.gov.au/geoserver/wfs"
BBOX = (145.5, -37.9, 148.3, -36.1)  # west, south, east, north — same area as build_places.py


def fetch(layer):
    q = dict(service="WFS", version="2.0.0", request="GetFeature", outputFormat="application/json", srsName="EPSG:4326",
             typeNames="open-data-platform:" + layer, CQL_FILTER="BBOX(geom,%s,%s,%s,%s,'EPSG:4326')" % BBOX)
    return json.load(urllib.request.urlopen(WFS + "?" + urllib.parse.urlencode(q), timeout=300))["features"]


def text(v, limit=700):
    v = re.sub(r"\s+", " ", str(v or "")).strip()
    return v if len(v) <= limit else v[:limit].rsplit(" ", 1)[0] + "…"


def yes(v):
    return str(v or "").strip().upper() == "Y"


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0


def closure(p):
    """Closure info, if the record has one. Dates are kept so the browser can decide if it's current."""
    if not p.get("clos_stat"):
        return None
    return {"s": (p.get("clos_start") or "")[:10], "o": (p.get("clos_open") or "")[:10],
            "r": text(p.get("clos_reas")).title(), "d": text(p.get("clos_desc"), 300)}


# ---------- Sites ----------
def site(f):
    p = f["properties"]
    facilities = []
    if yes(p.get("camping")): facilities.append("Camping")
    if yes(p.get("campervanning")):
        facilities.append({"CAMPER TRAILER": "Camper trailers", "SMALL CARAVAN": "Small caravans"}.get(p.get("campervan_type"), "Campervans"))
    if yes(p.get("picnicing")): facilities.append("Picnic area")
    if num(p.get("pct_pedest")) or num(p.get("pct_aframe")) or num(p.get("pct_other")): facilities.append("Toilets")
    if num(p.get("bbq_pit")): facilities.append("Fire pits")
    if num(p.get("bbq_wood")): facilities.append("Wood BBQ")
    if num(p.get("bbq_gas")): facilities.append("Gas BBQ")
    for key, label in [("fishing", "Fishing"), ("paddling", "Paddling"), ("heritage", "Heritage"), ("horse_ride", "Horse riding"),
                       ("hang_glide", "Hang gliding"), ("walkingdog", "Dogs allowed")]:
        if yes(p.get(key)): facilities.append(label)
    if p.get("dis_access") in ("PARTIAL", "FULL", "FULLY"):
        facilities.append("Wheelchair access" + (" (partial)" if p["dis_access"] == "PARTIAL" else ""))

    kind = "pvcamp" if yes(p.get("camping")) else "pvpicnic" if yes(p.get("picnicing")) else "pvsite"
    desc = " ".join(dict.fromkeys(filter(None, [text(p.get("comments")), text(p.get("camping_c")),
                                                text(p.get("campervan_c")), text(p.get("picnicing_c"))])))
    props = {"n": text(p.get("name"), 80), "k": kind, "f": facilities, "d": text(desc), "a": text(p.get("access_dsc"), 600)}
    if closure(p): props["cl"] = closure(p)
    return {"type": "Feature", "geometry": {"type": "Point", "coordinates": [round(c, 5) for c in f["geometry"]["coordinates"]]},
            "properties": {k: v for k, v in props.items() if v}}


# ---------- Routes ----------
ACTIVITIES = [  # prefix, kind, label — vehicle routes first so a long drive isn't coloured as a walk
    ("f", "drive", "4WD"), ("d", "drive", "Scenic drive"), ("t", "ride", "Trail bike"),
    ("m", "ride", "Mountain bike"), ("h", "ride", "Horse riding"), ("w", "walk", "Walk"),
]
DURATION = {"SHORT (<1 HOUR)": "under 1 hr", "MEDIUM (1-4 HOURS)": "1–4 hrs", "DAY (>4 HOURS)": "4+ hrs",
            "OVERNIGHT": "overnight", "MULTIPLE DAYS": "multi-day"}


def duration(hours):
    h = num(hours)
    if not h: return ""
    return f"{round(h * 60)} min" if h < 1 else f"{h:g} hr" if h == 1 else f"{h:g} hrs"


def activity(p, prefix, label):
    dist = num(p.get(prefix + "_distance"))
    parts = [label]
    if dist: parts.append(f"{dist:g} km" + (" return" if p.get(prefix + "_measure") == "RETURN" else " one way"))
    parts.append(duration(p.get(prefix + "_time")) or DURATION.get(p.get(prefix + "_durdesc"), ""))
    grade = p.get(prefix + "_grade") if prefix != "w" else p.get("w_level")
    if prefix == "m": grade = p.get("m_difficult")
    parts.append(str(grade or "").strip().capitalize() if prefix in ("h", "d") else str(grade or "").strip())
    return " · ".join(filter(None, parts))


def simplify(line, tol=0.00008):
    """Douglas–Peucker, ~8 m tolerance — plenty for a highlight under the base map's own track line."""
    if len(line) < 3: return line
    keep, stack = {0, len(line) - 1}, [(0, len(line) - 1)]
    while stack:
        a, b = stack.pop()
        (x1, y1), (x2, y2) = line[a][:2], line[b][:2]
        dx, dy, best, idx = x2 - x1, y2 - y1, 0, None
        norm = math.hypot(dx, dy) or 1e-12
        for i in range(a + 1, b):
            d = abs(dy * (line[i][0] - x1) - dx * (line[i][1] - y1)) / norm
            if d > best: best, idx = d, i
        if idx is not None and best > tol:
            keep.add(idx); stack += [(a, idx), (idx, b)]
    return [[round(line[i][0], 5), round(line[i][1], 5)] for i in sorted(keep)]


def route(f):
    p = f["properties"]
    acts = [(kind, activity(p, prefix, label)) for prefix, kind, label in ACTIVITIES if yes(p.get(prefix + "_activity"))]
    lines = [simplify(l) for l in f["geometry"]["coordinates"] if len(l) > 1]
    if not lines: return None
    xs, ys = [c[0] for l in lines for c in l], [c[1] for l in lines for c in l]
    track = " · ".join(filter(None, [p.get("qual_track"), p.get("w_gradient"), p.get("w_steps"), p.get("qual_mark")]))
    desc = " ".join(dict.fromkeys(filter(None, [text(p.get(k)) for k in
                                                ("w_comment", "f_comment", "m_comment", "d_comment", "t_comment", "h_comment", "comments")])))
    props = {"n": text(p.get("name"), 90), "k": acts[0][0] if acts else "walk", "g": [a for _, a in acts],
             "x": text(p.get("w_expert"), 80), "t": text(track, 160), "d": text(desc), "a": text(p.get("access_dsc"), 600),
             "b": [round(min(xs), 5), round(min(ys), 5), round(max(xs), 5), round(max(ys), 5)]}
    if closure(p): props["cl"] = closure(p)
    return {"type": "Feature", "geometry": {"type": "MultiLineString", "coordinates": lines},
            "properties": {k: v for k, v in props.items() if v}}


def write(path, features):
    json.dump({"type": "FeatureCollection", "features": features}, open(path, "w"), separators=(",", ":"), ensure_ascii=False)


sites = [site(f) for f in fetch("recweb_site") if f.get("geometry")]
routes = [r for r in (route(f) for f in fetch("recweb_tracks") if f.get("geometry")) if r]
write("public/data/pv_sites.geojson", sites)
write("public/data/pv_routes.geojson", routes)

# Drop OSM campsites that duplicate a Parks Victoria campground (within ~300 m).
camps = [s["geometry"]["coordinates"] for s in sites if s["properties"]["k"] == "pvcamp"]
def near(c, others, metres=300):
    return any(math.hypot((c[0] - o[0]) * 89_000, (c[1] - o[1]) * 111_000) < metres for o in others)
places = json.load(open("public/data/places.geojson"))
before = len(places["features"])
places["features"] = [f for f in places["features"]
                      if not (f["properties"]["k"] == "campsite" and near(f["geometry"]["coordinates"], camps))]
write("public/data/places.geojson", places["features"])

from collections import Counter
print(f"{len(sites)} sites {dict(Counter(s['properties']['k'] for s in sites))}")
print(f"{len(routes)} routes {dict(Counter(r['properties']['k'] for r in routes))}")
print(f"removed {before - len(places['features'])} duplicate OSM campsites")
