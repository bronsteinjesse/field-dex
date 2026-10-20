# Sample: real bird photos from iNaturalist with the background cut out, for comparing against the drawn icons.
import io, json, os, sys, urllib.request, urllib.parse
from PIL import Image
from rembg import remove, new_session

BIRDS = ["Upupa epops", "Curruca melanocephala", "Cyanocitta cristata", "Cardinalis cardinalis", "Turdus migratorius",
         "Poecile atricapillus", "Spinus tristis", "Melanerpes carolinus", "Anas platyrhynchos", "Ardea herodias",
         "Archilochus colubris", "Zonotrichia albicollis", "Setophaga magnolia", "Megaceryle alcyon", "Platalea ajaja", "Egretta thula"]
UA = {"User-Agent": "field-dex-art-sample/1.0 (github.com/bronsteinjesse/field-dex)"}
get = lambda u: urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=30).read()
sess = new_session("isnet-general-use")
os.makedirs("art-sample", exist_ok=True)
credits = {}
for sci in BIRDS:
    t = json.loads(get("https://api.inaturalist.org/v1/taxa?rank=species&per_page=1&q=" + urllib.parse.quote(sci)))["results"][0]
    full = json.loads(get(f"https://api.inaturalist.org/v1/taxa/{t['id']}"))["results"][0]
    slug = sci.lower().replace(" ", "-")
    for n, tp in enumerate(full["taxon_photos"][:4]):
        p = tp["photo"]
        img = Image.open(io.BytesIO(get(p["url"].replace("square", "large")))).convert("RGB")
        cut = remove(img, session=sess)
        box = cut.getchannel("A").point(lambda a: 255 if a > 40 else 0).getbbox()
        if not box: continue
        cut = cut.crop(box)
        s = int(max(cut.size) * 1.08)
        sq = Image.new("RGBA", (s, s)); sq.paste(cut, ((s - cut.width) // 2, (s - cut.height) // 2))
        sq.thumbnail((360, 360), Image.LANCZOS)
        sq.save(f"art-sample/{slug}-{n}.png")
        credits[f"{slug}-{n}"] = {"name": t.get("preferred_common_name"), "by": p.get("attribution"), "license": p.get("license_code")}
    print(sci, "ok", flush=True)
json.dump(credits, open("art-sample/credits.json", "w"), indent=1)
