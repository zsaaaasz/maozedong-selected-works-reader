import { useEffect, useState } from 'react';
import type { Article, LangCode } from '@/types';
import { getArticleMeta } from '@/data/manifest';

/**
 * 正文段落在部分内容 JSON 里只写了 id/text，没有 kind 字段。
 * 缺省一律按 body 处理，否则会出现：正文没有 2em 缩进、
 * 选字时找不到可注释段落、脚注标记不渲染。
 */
function normalizeParagraphKinds(article: Article): Article {
  (Object.keys(article.translations) as LangCode[]).forEach((lang) => {
    const translation = article.translations[lang];
    if (!translation?.paragraphs) return;
    translation.paragraphs = translation.paragraphs.map((paragraph) => ({
      ...paragraph,
      kind: paragraph.kind ?? 'body',
    }));
  });
  return article;
}

/**
 * Fetches article content from /public/content/{id}.json.
 * The fetched article's metadata is merged with the manifest's metadata
 * (which carries `interpretation` and `situations` — not in the JSON).
 */
export function useArticle(articleId: string | undefined) {
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!articleId) {
      setLoading(false);
      setError('No article id');
      return;
    }
    const meta = getArticleMeta(articleId);
    if (!meta) {
      setLoading(false);
      setError('Article not found in manifest');
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetchOnce = async () => {
      const res = await fetch(`/content/${articleId}.json`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return (await res.json()) as Article;
    };

    fetchOnce()
      .then((a) => {
        if (cancelled) return;
        // Merge manifest metadata over JSON metadata so the rich
        // interpretation/situations live alongside the article text.
        a.metadata = { ...a.metadata, ...meta };
        setArticle(normalizeParagraphKinds(a));
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'unknown error');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [articleId]);

  return { article, loading, error };
}
