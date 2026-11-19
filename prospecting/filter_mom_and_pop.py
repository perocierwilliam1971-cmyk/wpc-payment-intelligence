#!/usr/bin/env python3
"""Drop chains/franchises from a google-maps-scraper-kit CSV, keep likely mom-and-pop shops.

Usage: python3 filter_mom_and_pop.py results.csv -o mom_and_pop.csv [--max-reviews 800] [--min-repeats 3]

Rules (heuristics, not truth - spot-check the output):
  1. Name matches a known chain/franchise brand  -> dropped
  2. Same name appears >= --min-repeats times in the file (multi-location) -> dropped
  3. Review count above --max-reviews (big operations) -> dropped
"""
import argparse, csv, re, sys
from collections import Counter

CHAINS = """
starbucks dunkin tim hortons dutch bros peet's caribou coffee scooter's coffee biggby
mcdonald's subway domino's pizza hut papa john's little caesars jersey mike's jimmy john's
firehouse subs chipotle taco bell wendy's burger king chick-fil-a krispy kreme baskin
dairy queen cold stone jamba smoothie king tropical smoothie panera
great clips supercuts sport clips fantastic sams cost cutters regis hair cuttery
european wax center massage envy hand & stone the joint ulta
jiffy lube valvoline midas meineke pep boys firestone goodyear discount tire
les schwab big o tires ntb tires plus monro christian brothers take 5 grease monkey
maaco caliber collision service king gerber collision
mister sparky one hour heating benjamin franklin plumbing roto-rooter ars rescue rooter
aire serv mr. rooter mr. electric pop-a-lock
total wine bevmo spec's abc fine wine 7-eleven circle k wawa sheetz casey's speedway
quiktrip racetrac cumberland farms
1-800-flowers ftd petsmart petco
aspen dental heartland dental pacific dental western dental gentle dental bright now coast dental
banfield vca bluepearl thrive pet medical the joint chiropractic
""".split()
# multi-word brands need phrase matching
PHRASES = [p.strip() for p in """
tim hortons|dutch bros|caribou coffee|scooter's coffee|pizza hut|papa john's|little caesars|
jersey mike's|jimmy john's|firehouse subs|taco bell|burger king|krispy kreme|dairy queen|
cold stone|smoothie king|tropical smoothie|great clips|sport clips|fantastic sams|cost cutters|
hair cuttery|european wax center|massage envy|hand & stone|the joint|jiffy lube|pep boys|
discount tire|les schwab|big o tires|tires plus|christian brothers|take 5|grease monkey|
caliber collision|service king|gerber collision|mister sparky|one hour heating|
benjamin franklin plumbing|ars rescue rooter|aire serv|mr. rooter|mr. electric|pop-a-lock|
total wine|abc fine wine|circle k|cumberland farms|aspen dental|heartland dental|pacific dental|western dental|gentle dental|bright now|coast dental|bluepearl|thrive pet|the joint chiropractic""".replace("\n", "").split("|")]
SINGLE = {w for w in CHAINS if w not in " ".join(PHRASES).split()}

def norm(s): return re.sub(r"\s+", " ", (s or "").lower()).strip()

def is_chain(name):
    n = norm(name)
    if any(p in n for p in PHRASES): return True
    return any(re.search(rf"(^|\W){re.escape(w)}(\W|$)", n) for w in SINGLE)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("csv"); ap.add_argument("-o", "--out", default="mom_and_pop.csv")
    ap.add_argument("--max-reviews", type=int, default=800)
    ap.add_argument("--min-repeats", type=int, default=3)
    a = ap.parse_args()
    rows = list(csv.DictReader(open(a.csv, newline="", encoding="utf-8")))
    if not rows: sys.exit("empty file")
    name_col = "title" if "title" in rows[0] else "name"
    counts = Counter(norm(r.get(name_col)) for r in rows)
    kept, why = [], Counter()
    for r in rows:
        n = r.get(name_col, "")
        try: rc = int(float(r.get("review_count") or 0))
        except ValueError: rc = 0
        if is_chain(n): why["chain brand"] += 1; continue
        if counts[norm(n)] >= a.min_repeats: why["multi-location"] += 1; continue
        if rc > a.max_reviews: why[f">{a.max_reviews} reviews"] += 1; continue
        kept.append(r)
    with open(a.out, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(kept)
    print(f"{len(rows)} in -> {len(kept)} mom-and-pop kept ({a.out})")
    for k, v in why.most_common(): print(f"  dropped {v:>4}  {k}")

if __name__ == "__main__": main()
