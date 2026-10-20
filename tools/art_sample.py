# Sample: real bird photos from iNaturalist with the background cut out, for comparing against the drawn icons.
import io, json, os, sys, urllib.request, urllib.parse
from PIL import Image
from rembg import remove, new_session

BIRDS = open(os.environ.get("SPECIES", "tools/species.txt")).read().split()  # pairs of words
BIRDS = [" ".join(BIRDS[i:i + 2]) for i in range(0, len(BIRDS), 2)]
_OLD = ["Upupa epops", "Curruca melanocephala", "Cyanocitta cristata", "Cardinalis cardinalis", "Turdus migratorius",
         "Poecile atricapillus", "Spinus tristis", "Melanerpes carolinus", "Anas platyrhynchos", "Ardea herodias",
         "Archilochus colubris", "Zonotrichia albicollis", "Setophaga magnolia", "Megaceryle alcyon", "Platalea ajaja", "Egretta thula"]
UA = {"User-Agent": "field-dex-art-sample/1.0 (github.com/bronsteinjesse/field-dex)"}
get = lambda u: urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=30).read()
sess = new_session("isnet-general-use")
OUT = "art"
os.makedirs(OUT, exist_ok=True)
OK = {"cc0", "cc-by", "cc-by-nc", "cc-by-sa", "cc-by-nc-sa"}
credits = json.load(open(f"{OUT}/credits.json")) if os.path.exists(f"{OUT}/credits.json") else {}
for sci in BIRDS:
  try:
    res = json.loads(get("https://api.inaturalist.org/v1/taxa?rank=species&per_page=10&q=" + urllib.parse.quote(sci)))["results"]
    t = next((r for r in res if r["name"] == sci), res[0])
    full = json.loads(get(f"https://api.inaturalist.org/v1/taxa/{t['id']}"))["results"][0]
    slug = sci.lower().replace(" ", "-")
    n = 0
    for tp in full["taxon_photos"][:12]:
        p = tp["photo"]
        if p.get("license_code") not in OK: continue
        if n >= 5: break
        img = Image.open(io.BytesIO(get(p["url"].replace("square", "large")))).convert("RGB")
        cut = remove(img, session=sess)
        box = cut.getchannel("A").point(lambda a: 255 if a > 40 else 0).getbbox()
        if not box: continue
        cut = cut.crop(box)
        s = int(max(cut.size) * 1.08)
        sq = Image.new("RGBA", (s, s)); sq.paste(cut, ((s - cut.width) // 2, (s - cut.height) // 2))
        sq.thumbnail((360, 360), Image.LANCZOS)
        sq.save(f"{OUT}/{slug}-{n}.png")
        credits[f"{slug}-{n}"] = {"sci": sci, "taxon": t["name"], "name": t.get("preferred_common_name"), "by": p.get("attribution"), "license": p.get("license_code"), "photo": p["id"]}
        n += 1
    print(sci, n, flush=True)
  except Exception as e:
    print(sci, "FAILED", e, flush=True)
json.dump(credits, open(f"{OUT}/credits.json", "w"), indent=1)
