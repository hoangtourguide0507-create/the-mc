/** Hàm viết tắt cho nội dung podcast: n(...) là Nora nói, o(...) là Owen nói. */
import type { PodLine } from '../core/podcast';

export const n = (en: string, vi: string): PodLine => ({ who: 'nora', en, vi });
export const o = (en: string, vi: string): PodLine => ({ who: 'owen', en, vi });
