# Sprite library for common birds.
#   python tools/library.py list            -> tools/library.txt (most-observed species in North America and Europe)
#   python tools/library.py build I N       -> art/lib/: up to 3 candidate sprites for every Nth species from offset I, best first
import io, json, os, sys, time, urllib.request, urllib.parse
import cv2, numpy as np
from PIL import Image
UA = {"User-Agent": "field-dex-sprites/1.0 (github.com/bronsteinjesse/field-dex)"}
def get(u):
    for i in range(4):
        try: return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=40).read()
        except Exception:
            if i == 3: raise
            time.sleep(3 * (i + 1))
api = lambda path: json.loads(get("https://api.inaturalist.org/v1/" + path))
OK = "cc0,cc-by,cc-by-nc,cc-by-sa,cc-by-nc-sa"

def species_list():
    def top(place, count):
        out, page = [], 1
        while len(out) < count:
            r = api(f"observations/species_counts?taxon_id=3&place_id={place}&quality_grade=research&per_page=500&page={page}")
            out += [(x["taxon"]["name"], x["taxon"]["id"]) for x in r["results"] if x["taxon"]["rank"] == "species"]
            if len(r["results"]) < 500: break
            page += 1; time.sleep(1)
        return out[:count]
    na, eu = top(97394, 650), top(97391, 450)  # North America, Europe
    have = set(open("tools/species.txt").read().split("\n"))
    seen, res = set(), []
    for name, tid in na + eu:
        if name not in seen and name not in have: seen.add(name); res.append(f"{name}\t{tid}")
    open("tools/library.txt", "w").write("\n".join(res) + "\n")
    print(len(res))

def score(cut, full_size):
    a = np.array(cut.getchannel("A")) > 110
    if a.sum() < 500: return -9
    n, lab, st, _ = cv2.connectedComponentsWithStats(a.astype(np.uint8))
    areas = sorted(st[1:, 4], reverse=True); big = [x for x in areas if x > a.sum() * 0.08]
    ys, xs = np.where(a); h, w = np.ptp(ys) + 1, np.ptp(xs) + 1
    fill = a.sum() / (h * w)
    H, W = a.shape
    edge = (ys.min() < 3) + (xs.min() < 3) + (ys.max() > H - 4) + (xs.max() > W - 4)  # cut off by the photo frame: a close-up
    frac = a.sum() / (H * W)
    s = areas[0] / a.sum() * 2 - (len(big) - 1) * 1.0 - edge * 0.7
    s += 0.6 if 0.3 < fill < 0.68 else 0           # wings spread or odd shapes fill the box poorly
    s += 0.4 if 0.05 < frac < 0.5 else -0.4        # tiny distant birds and frame-filling close-ups both read badly
    s += 0.3 if 0.6 < w / h < 1.8 else 0
    return s

def build(i, n):
    from rembg import remove, new_session
    sys.path.insert(0, "tools"); from sprite import sprite
    sess = new_session("isnet-general-use")
    rows = [l.split("\t") for l in open("tools/library.txt").read().split("\n") if l][i::n]
    os.makedirs("art/lib", exist_ok=True)
    credits = {}
    for name, tid in rows:
        slug = name.lower().replace(" ", "-")
        try:
            t = api(f"taxa/{tid}")["results"][0]
            photos = [tp["photo"] for tp in t.get("taxon_photos", []) if tp["photo"].get("license_code") in OK.split(",")][:5]
            if len(photos) < 5:
                obs = api(f"observations?taxon_id={tid}&quality_grade=research&photo_license={OK}&order_by=votes&per_page=10")["results"]
                photos += [o["photos"][0] for o in obs if o.get("photos")][:8 - len(photos)]
            cands = []
            for p in photos[:8]:
                img = Image.open(io.BytesIO(get(p["url"].replace("square", "medium")))).convert("RGB")
                cut = remove(img, session=sess)
                cands.append((score(cut, img.size), cut, p))
            cands.sort(key=lambda c: -c[0])
            k = 0
            for sc, cut, p in cands[:3]:
                if sc < -5: continue
                path = f"/tmp/{slug}.png"; cut.save(path)
                cv2.imwrite(f"art/lib/{slug}-{k}.png", sprite(path))
                credits[f"{slug}-{k}"] = {"sci": name, "name": t.get("preferred_common_name"), "by": p.get("attribution"), "license": p.get("license_code"), "score": round(float(sc), 2)}
                k += 1
            print(name, k, flush=True)
        except Exception as e:
            print(name, "FAILED", e, flush=True)
    json.dump(credits, open(f"art/lib/credits-{i}.json", "w"), indent=0)

if __name__ == "__main__":
    species_list() if sys.argv[1] == "list" else build(int(sys.argv[2]), int(sys.argv[3]))
