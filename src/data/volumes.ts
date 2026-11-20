import { ARTICLES } from './manifest';
import type { ArticleMetadata } from '@/types';

export const VOLUMES = [
  { id: '1', label: '第一卷', fullTitle: '《毛泽东选集》第一卷' },
  { id: '2', label: '第二卷', fullTitle: '《毛泽东选集》第二卷' },
  { id: '3', label: '第三卷', fullTitle: '《毛泽东选集》第三卷' },
  { id: '4', label: '第四卷', fullTitle: '《毛泽东选集》第四卷' },
] as const;

export type VolumeId = (typeof VOLUMES)[number]['id'];

export function getVolume(id: string | undefined) {
  return VOLUMES.find((volume) => volume.id === id);
}

export function getVolumeForArticle(article: ArticleMetadata | undefined) {
  if (!article?.volume) return VOLUMES[0];
  return VOLUMES.find((volume) => article.volume === volume.fullTitle) ?? VOLUMES[0];
}

export function getArticlesForVolume(id: string): ArticleMetadata[] {
  const volume = getVolume(id);
  if (!volume) return [];
  // ARTICLES is already sorted by the source book's table of contents.
  return ARTICLES.filter((article) => article.volume === volume.fullTitle);
}
