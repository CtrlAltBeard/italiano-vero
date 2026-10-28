#!/usr/bin/env python3
"""
split_data.py — one-shot migration for Italiano Vero.

Reads data/vocab.json (the old single-file format) and writes:
  - one JSON file per category   ->  data/<id>.json
  - data/manifest.json           ->  the file list (order = home grid)

Run it from the repo root:
    python3 tools/split_data.py

It validates as it goes (duplicate ids, missing fields) and deletes
NOTHING. After verifying the app works, retire the old file yourself:
    rm data/vocab.json
"""

import json
from pathlib import Path

DATA_DIR = Path("data")
SOURCE = DATA_DIR / "vocab.json"


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"Mamma mia: {SOURCE} not found. Run me from the repo root.")

    # read_text(encoding="utf-8") — never trust the platform default charset
    data = json.loads(SOURCE.read_text(encoding="utf-8"))
    categories = data.get("categories", [])
    vocabulary = data.get("vocabulary", [])

    # group entries by category once: cheap, tidy, O(n)
    by_cat: dict[str, list[dict]] = {}
    for entry in vocabulary:
        by_cat.setdefault(entry.get("cat", "?"), []).append(entry)

    seen_ids: set[str] = set()
    manifest: list[str] = []

    for cat in categories:
        entries = []
        for entry in by_cat.get(cat["id"], []):
            if not all(k in entry for k in ("id", "it", "en")):
                print(f"  ⚠️  {cat['id']}: entry missing id/it/en — skipped")
                continue
            if entry["id"] in seen_ids:
                print(f"  ⚠️  duplicate id {entry['id']} — skipped")
                continue
            seen_ids.add(entry["id"])
            # 'cat' is implied by the file it lives in — strip it
            entries.append({k: v for k, v in entry.items() if k != "cat"})

        cat_file = {
            "id": cat["id"],
            "emoji": cat["emoji"],
            "name": cat["name"],
            "desc": cat["desc"],
            "level": cat["level"],
            "vocabulary": entries,
        }
        name = f"{cat['id']}.json"
        # ensure_ascii=False keeps è, é and 🤌 human-readable instead of escaped
        (DATA_DIR / name).write_text(
            json.dumps(cat_file, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        manifest.append(name)
        print(f"  ✔ {name:<16} {len(entries):3d} entries")

    (DATA_DIR / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"  ✔ {'manifest.json':<16} {len(manifest)} categories")

    leftovers = [c for c in by_cat if c not in {x["id"] for x in categories}]
    if leftovers:
        print(f"\n  ⚠️  entries reference unknown categories: {leftovers}")

    total = sum(len(v) for v in by_cat.values())
    print(f"\nDone — {total} entries across {len(manifest)} categories.")
    print(f"Next: test the app, then retire the old file: rm {SOURCE}")


if __name__ == "__main__":
    main()