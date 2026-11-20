import type { ReactNode } from 'react';
import type { Paragraph, LangCode } from '@/types';
import { footnoteNumberFromMarker } from '@/lib/footnotes';

const FOOTNOTE_MARKER_PATTERN = /[①-⑳⑴-⒇⒈-⒛]/gu;
const INLINE_HEADING_PATTERN = /(^|[。！？；：])([ \t\u3000]*)([一二三四五六七八九十百]{1,3})　{1,2}/gu;

export function ParagraphView({
  p,
  lang,
  footnoteNumbers,
  footnoteReferenceIds,
  onFootnoteJump,
}: {
  p: Paragraph;
  lang: LangCode;
  footnoteNumbers?: Set<number>;
  footnoteReferenceIds?: Map<string, string>;
  onFootnoteJump?: (number: number) => void;
}) {
  const kind = p.kind ?? 'body';

  if (kind === 'heading') {
    return (
      <h2
        data-para-id={p.id}
        className="mt-11 mb-5 scroll-mt-24 border-l-[3px] border-cinnabar pl-[0.72em] font-serif-cn text-[1.28rem] font-semibold leading-[1.5] tracking-[0.06em] text-ink dark:text-dark-ink sm:mt-14 sm:text-[1.4rem]"
      >
        {p.text}
      </h2>
    );
  }

  const textClass = lang === 'zh-CN'
    ? 'para-zh text-[18px] leading-[2.05] sm:text-[18.5px] sm:leading-[2.1]'
    : 'para-en text-[15px] leading-[1.8] sm:text-base';

  if (kind === 'note') {
    return (
      <p data-para-id={p.id} className="my-2 text-[13px] leading-[1.85] text-secondary dark:text-dark-secondary">
        {p.text}
      </p>
    );
  }

  return (
    <p
      data-para-id={p.id}
      data-selectable={kind === 'body' ? 'true' : undefined}
      className={[
        textClass,
        kind === 'body'
          ? 'reader-selectable my-6 scroll-mt-24 text-justify [text-indent:2em] sm:my-7'
          : 'my-6 text-justify sm:my-7',
        kind === 'quote' ? 'border-l-2 border-moss/40 pl-4 text-secondary dark:text-dark-secondary' : '',
      ].join(' ')}
    >
      {kind === 'body'
        ? renderBodyWithHeadings(p, footnoteNumbers, footnoteReferenceIds, onFootnoteJump)
        : renderText(p, p.text, 0, footnoteNumbers, footnoteReferenceIds, onFootnoteJump)}
    </p>
  );
}

function renderBodyWithHeadings(
  paragraph: Paragraph,
  footnoteNumbers?: Set<number>,
  referenceIds?: Map<string, string>,
  onFootnoteJump?: (number: number) => void,
): ReactNode[] | string {
  const headings = [...paragraph.text.matchAll(INLINE_HEADING_PATTERN)].map((match) => ({
    start: (match.index ?? 0) + match[1].length + match[2].length,
  }));
  if (headings.length === 0) {
    return renderText(paragraph, paragraph.text, 0, footnoteNumbers, referenceIds, onFootnoteJump);
  }

  const parts: ReactNode[] = [];
  let cursor = 0;
  headings.forEach(({ start }, index) => {
    if (start > cursor) {
      parts.push(renderText(
        paragraph,
        paragraph.text.slice(cursor, start),
        cursor,
        footnoteNumbers,
        referenceIds,
        onFootnoteJump,
      ));
    }

    const end = headings[index + 1]?.start ?? paragraph.text.length;
    parts.push(
      <span key={paragraph.id + '-section-' + start} className="reader-inline-heading">
        {renderText(
          paragraph,
          paragraph.text.slice(start, end),
          start,
          footnoteNumbers,
          referenceIds,
          onFootnoteJump,
        )}
      </span>,
    );
    cursor = end;
  });

  if (cursor < paragraph.text.length) {
    parts.push(renderText(
      paragraph,
      paragraph.text.slice(cursor),
      cursor,
      footnoteNumbers,
      referenceIds,
      onFootnoteJump,
    ));
  }
  return parts;
}

function renderText(
  paragraph: Paragraph,
  text: string,
  baseOffset: number,
  footnoteNumbers?: Set<number>,
  referenceIds?: Map<string, string>,
  onFootnoteJump?: (number: number) => void,
): ReactNode[] | string {
  if ((paragraph.kind ?? 'body') !== 'body' || !footnoteNumbers?.size) return text;

  const parts: ReactNode[] = [];
  let cursor = 0;
  for (const match of text.matchAll(FOOTNOTE_MARKER_PATTERN)) {
    if (match.index === undefined) continue;
    const number = footnoteNumberFromMarker(match[0]);
    if (number === null || !footnoteNumbers.has(number)) continue;
    if (match.index > cursor) parts.push(text.slice(cursor, match.index));
    const anchorId = referenceIds?.get(paragraph.id + ':' + (baseOffset + match.index));
    parts.push(
      <a
        key={paragraph.id + '-footnote-' + (baseOffset + match.index)}
        id={anchorId}
        href={'#footnote-' + number}
        className="footnote-ref"
        aria-label={'转到注释' + number}
        onClick={(event) => {
          event.preventDefault();
          onFootnoteJump?.(number);
        }}
      >
        {number}
      </a>,
    );
    cursor = match.index + match[0].length;
  }
  if (cursor === 0) return text;
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}
