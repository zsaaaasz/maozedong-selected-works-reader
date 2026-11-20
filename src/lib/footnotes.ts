import type { Paragraph } from '@/types';

const FOOTNOTE_MARKER_PATTERN = /[①-⑳⑴-⒇⒈-⒛]/gu;

export interface FootnoteReference {
  number: number;
  paragraphId: string;
  offset: number;
  id: string;
}

export function footnoteNumberFromMarker(marker: string): number | null {
  const code = marker.codePointAt(0);
  if (code === undefined) return null;
  if (code >= 0x2460 && code <= 0x2473) return code - 0x2460 + 1;
  if (code >= 0x2474 && code <= 0x2487) return code - 0x2474 + 1;
  if (code >= 0x2488 && code <= 0x249b) return code - 0x2488 + 1;
  return null;
}

export function footnoteNumberFromText(text: string): number | null {
  const match = /^〔(\d+)〕/.exec(text.trimStart());
  if (!match) return null;
  const number = Number(match[1]);
  return Number.isFinite(number) ? number : null;
}

export function findFootnoteReferences(
  paragraphs: Paragraph[],
  availableNumbers: Set<number>,
): FootnoteReference[] {
  const references: FootnoteReference[] = [];
  for (const paragraph of paragraphs) {
    if (paragraph.kind !== 'body') continue;
    for (const match of paragraph.text.matchAll(FOOTNOTE_MARKER_PATTERN)) {
      const number = footnoteNumberFromMarker(match[0]);
      if (number === null || !availableNumbers.has(number) || match.index === undefined) continue;
      references.push({
        number,
        paragraphId: paragraph.id,
        offset: match.index,
        id: `footnote-ref-${paragraph.id}-${match.index}`,
      });
    }
  }
  return references;
}

export function findTextRange(
  element: HTMLElement,
  startOffset: number,
  endOffset: number,
): Range | null {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  let cursor = 0;
  let start: { node: Text; offset: number } | null = null;
  let end: { node: Text; offset: number } | null = null;

  while (node) {
    const textNode = node as Text;
    const nextCursor = cursor + textNode.data.length;
    if (!start && startOffset <= nextCursor) {
      start = { node: textNode, offset: Math.max(0, startOffset - cursor) };
    }
    if (endOffset <= nextCursor) {
      end = { node: textNode, offset: Math.max(0, endOffset - cursor) };
      break;
    }
    cursor = nextCursor;
    node = walker.nextNode();
  }

  if (!start || !end) return null;
  const range = document.createRange();
  range.setStart(start.node, Math.min(start.offset, start.node.length));
  range.setEnd(end.node, Math.min(end.offset, end.node.length));
  return range;
}
