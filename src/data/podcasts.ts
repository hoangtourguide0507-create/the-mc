/**
 * Podcast du lịch "Hidden Corners" (tab Luyện tập, mục Podcast). Thứ tự là thứ tự hiện trong danh sách: B1 → B1+ → B2.
 * Viết tập mới: mỗi tập có cả Nora và Owen, 18–30 câu, 280–620 từ, đúng 5 câu hỏi; `find` của mỗi câu hỏi phải có trong 1–2 câu thoại
 * (npm run test:podcast kiểm). Giọng render bằng Kokoro, phase `podcast` trong tools/voice-lines.mjs.
 */
import type { PodEpisode } from '../core/podcast';
import { PODCASTS_CN1 } from './podcasts.cn1';
import { PODCASTS_CN2 } from './podcasts.cn2';

export const PODCASTS: PodEpisode[] = [...PODCASTS_CN1, ...PODCASTS_CN2];
