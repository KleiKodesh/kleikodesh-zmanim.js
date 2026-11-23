# Terrain horizon of every place (CI only: downloads DEM tiles). Writes OUT (TSV: id, then one int16 per azimuth
# bin, hundredths of a degree) for the places of shard SHARD of SHARDS.
#
# DEM: Copernicus DEM GLO-90 (3 arc-second), public COG tiles on the AWS Open Data registry
#   https://registry.opendata.aws/copernicus-dem/  (free use with attribution, see README).
# Geometry: from the observer (DEM ground at the place + EYE metres) rays go out every AZ_STEP degree of azimuth to
# MAX_KM. A terrain point at distance d and height H appears at elevation angle
#   atan((H - h - d^2 (1 - k) / (2 R)) / d)
# (Earth curvature lowered by standard terrestrial refraction, k = 0.13: the coefficient of the classic Gauss
# survey of Hanover and of standard geodesy texts, e.g. W. Torge, Geodesy; A. T. Young, "Sunset science IV",
# Astronomical Journal 127 (2004) on low-path refraction). The horizon of an azimuth is the highest such angle.
# GLO-90 is a surface model (buildings and trees included): each tile gets a grey-scale morphological opening
# (erosion then dilation, OPEN_CELLS x OPEN_CELLS cells, about 450 m) first, which removes features narrower than
# that (tower blocks, tree stands) and keeps the shape of hills and ridges wider than it.
import math, os, sys, urllib.request
import numpy as np
import rasterio
from scipy.ndimage import grey_opening

EYE = 1.6
MAX_KM = 150
MIN_M = 300            # nearer points are mostly buildings and trees in a surface model
R = 6_371_000.0
K = 0.13
OPEN_CELLS = 5
AZ = list(range(30, 151)) + list(range(210, 331))
NODATA_OUT = -32768
CACHE = os.environ.get('CACHE', 'dem-cache')
os.makedirs(CACHE, exist_ok=True)

def tile_name(lat, lng):
    ns = f"N{lat:02d}" if lat >= 0 else f"S{-lat:02d}"
    ew = f"E{lng:03d}" if lng >= 0 else f"W{-lng:03d}"
    return f"Copernicus_DSM_COG_30_{ns}_00_{ew}_00_DEM"

tiles = {}
def tile(lat, lng):
    key = (lat, lng)
    if key in tiles: return tiles[key]
    name = tile_name(lat, lng)
    path = os.path.join(CACHE, name + '.tif')
    if not os.path.exists(path):
        url = f"https://copernicus-dem-90m.s3.amazonaws.com/{name}/{name}.tif"
        try:
            urllib.request.urlretrieve(url, path + '.part'); os.replace(path + '.part', path)
        except Exception:
            tiles[key] = None   # no tile: open sea
            return None
    with rasterio.open(path) as src:
        a = src.read(1).astype(np.float32)
        t = src.transform
        nd = src.nodata
    if nd is not None: a[a == nd] = 0
    a = grey_opening(a, size=(OPEN_CELLS, OPEN_CELLS))
    tiles[key] = (a, t)
    if len(tiles) > 120: tiles.pop(next(iter(tiles)))
    return tiles[key]

def heights(lats, lngs):
    out = np.zeros(lats.shape, np.float32)
    tl = np.floor(lats).astype(int); tg = np.floor(lngs).astype(int)
    for a, g in set(zip(tl.tolist(), tg.tolist())):
        m = (tl == a) & (tg == g)
        t = tile(a, g)
        if t is None: continue
        arr, tr = t
        col = (lngs[m] - tr.c) / tr.a - 0.5
        row = (lats[m] - tr.f) / tr.e - 0.5
        c0 = np.clip(np.floor(col).astype(int), 0, arr.shape[1] - 2); r0 = np.clip(np.floor(row).astype(int), 0, arr.shape[0] - 2)
        fc = np.clip(col - c0, 0, 1); fr = np.clip(row - r0, 0, 1)
        v = (arr[r0, c0] * (1 - fc) * (1 - fr) + arr[r0, c0 + 1] * fc * (1 - fr)
             + arr[r0 + 1, c0] * (1 - fc) * fr + arr[r0 + 1, c0 + 1] * fc * fr)
        out[m] = v
    return out

# distances: 90 m steps to 5 km, then growing by 1.5% (still under the 90 m grid near, ~2 km far)
d = []
x = MIN_M
while x < MAX_KM * 1000:
    d.append(x); x += max(90.0, x * 0.015)
D = np.array(d)

def profile(lat, lng):
    h0 = float(heights(np.array([lat]), np.array([lng]))[0]) + EYE
    az = np.radians(np.array(AZ, float))[:, None]
    p1 = math.radians(lat); l1 = math.radians(lng); dd = (D / R)[None, :]
    p2 = np.arcsin(np.sin(p1) * np.cos(dd) + np.cos(p1) * np.sin(dd) * np.cos(az))
    l2 = l1 + np.arctan2(np.sin(az) * np.sin(dd) * np.cos(p1), np.cos(dd) - np.sin(p1) * np.sin(p2))
    H = heights(np.degrees(p2).ravel(), ((np.degrees(l2) + 540) % 360 - 180).ravel()).reshape(p2.shape)
    ang = np.degrees(np.arctan((H - h0 - D[None, :] ** 2 * (1 - K) / (2 * R)) / D[None, :]))
    return np.round(ang.max(axis=1) * 100).astype(int), h0, D[ang.argmax(axis=1)]

def main():
    shard, shards = int(os.environ.get('SHARD', 0)), int(os.environ.get('SHARDS', 1))
    rows = [l.rstrip('\n').split('\t') for l in open('data/places.tsv', encoding='utf8')][1:]
    rows = [r for r in rows if r and r[0]]
    rows.sort(key=lambda r: (math.floor(float(r[4])), math.floor(float(r[5])), int(r[0])))   # tile neighbours together
    n = len(rows); mine = rows[n * shard // shards: n * (shard + 1) // shards]
    with open(os.environ.get('OUT', 'horizon-part.tsv'), 'w') as f:
        for i, r in enumerate(mine):
            v, h0, dist = profile(float(r[4]), float(r[5]))
            if r[0] in ('1', '45', '97', '98', '188'):
                print(f"sample id {r[0]}: eye {h0:.0f} m; az/deg/km " + ' '.join(f"{AZ[j]}:{v[j]/100:.2f}@{dist[j]/1000:.1f}" for j in range(0, len(AZ), 15)), flush=True)
            f.write(r[0] + '\t' + '\t'.join(map(str, v)) + '\n')
            if i % 20 == 0:
                print(f"{i + 1}/{len(mine)} id {r[0]} {r[3]}: eye {h0:.0f} m, east max {v[:121].max()/100:.2f}, west max {v[121:].max()/100:.2f}", flush=True)

main()
