"""Restore missing endnotes and drop unused English translations for the offline reader."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = Path(__file__).with_name("mao-selected-1991.txt")
CONTENT = ROOT / "public" / "content"

# The original 22 curated entries use readable IDs instead of their source
# article numbers. The other 137 entries already contain parsed endnotes.
CURATED_SOURCE_NUMBERS = {
    "classes-analysis-1925": "001",
    "hunan-peasant-movement-1927": "002",
    "spark-1930": "006",
    "oppose-book-worship-1930": "007",
    "masses-life-1934": "011",
    "anti-japan-strategy-1935": "012",
    "strategy-civil-war-1936": "013",
    "on-practice-1937": "017",
    "on-contradiction-1937": "018",
    "protracted-war-1938": "027",
    "party-role-1938": "028",
    "communists-founding-1939": "038",
    "bethune-1939": "043",
    "new-democracy-1940": "044",
    "united-front-tactics-1940": "052",
    "rectify-party-style-1942": "064",
    "oppose-party-stereotypes-1942": "065",
    "yanan-talks-1942": "066",
    "serve-people-1944": "077",
    "postwar-situation-1945": "090",
    "revolution-end-1949": "137",
    "peoples-democratic-dictatorship-1949": "154",
}

ARTICLE_NUMBER = re.compile(r"^\s*(\d{3})\s*$")
NOTE_START = re.compile(r"^\s*〔(\d+)〕\s*(.*)$")


def source_articles() -> dict[str, list[str]]:
    lines = SOURCE.read_text(encoding="utf-8").replace("\r\n", "\n").split("\n")
    starts: list[tuple[int, str]] = []
    for index, line in enumerate(lines):
        match = ARTICLE_NUMBER.fullmatch(line)
        if match:
            starts.append((index, match.group(1)))

    parsed: dict[str, list[str]] = {}
    for position, (start, number) in enumerate(starts):
        end = starts[position + 1][0] if position + 1 < len(starts) else len(lines)
        chunk = lines[start + 1 : end]
        first_note = next(
            (i for i, line in enumerate(chunk) if NOTE_START.match(line)),
            None,
        )
        if first_note is None:
            parsed[number] = []
            continue

        notes: list[str] = []
        for line in chunk[first_note:]:
            match = NOTE_START.match(line)
            if match:
                notes.append(f"〔{match.group(1)}〕 {match.group(2).strip()}".rstrip())
            elif line.strip() and notes:
                notes[-1] += line.strip()
        parsed[number] = notes
    return parsed


def main() -> None:
    parsed = source_articles()
    prepared: list[tuple[Path, dict, list[str]]] = []

    for article_id, source_number in CURATED_SOURCE_NUMBERS.items():
        path = CONTENT / f"{article_id}.json"
        if not path.is_file():
            raise FileNotFoundError(path)
        article = json.loads(path.read_text(encoding="utf-8"))
        notes = parsed.get(source_number, [])
        if not notes:
            raise ValueError(f"No source endnotes found for {article_id} ({source_number})")
        prepared.append((path, article, notes))

    # Validate every target before writing any file.
    for path, article, notes in prepared:
        translation = article["translations"].get("zh-CN")
        if translation is None:
            raise ValueError(f"Missing zh-CN translation in {path.name}")
        paragraphs = translation["paragraphs"]
        if any(paragraph.get("kind") == "note" for paragraph in paragraphs):
            raise ValueError(f"Endnotes already present in {path.name}; refusing to duplicate them")

    for path, article, notes in prepared:
        translation = article["translations"]["zh-CN"]
        paragraphs = translation["paragraphs"]
        article_id = article["metadata"]["id"]
        paragraphs.append({
            "id": f"{article_id}-footnotes-title",
            "kind": "heading",
            "text": "注释",
        })
        for index, note in enumerate(notes, start=1):
            paragraphs.append({
                "id": f"{article_id}-footnote-{index:03d}",
                "kind": "note",
                "text": note,
            })

        # English translations are not part of the personal reader product.
        article["translations"].pop("en", None)
        path.write_text(
            json.dumps(article, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

    # The remaining files only need the English translation removed.
    curated_names = {f"{article_id}.json" for article_id in CURATED_SOURCE_NUMBERS}
    for path in CONTENT.glob("*.json"):
        if path.name in curated_names:
            continue
        article = json.loads(path.read_text(encoding="utf-8"))
        if article.get("translations", {}).pop("en", None) is not None:
            path.write_text(
                json.dumps(article, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )

    print(f"Restored source endnotes for {len(prepared)} articles; removed English translations.")
    print(f"Restored {sum(len(notes) for _, _, notes in prepared)} endnotes.")


if __name__ == "__main__":
    main()
