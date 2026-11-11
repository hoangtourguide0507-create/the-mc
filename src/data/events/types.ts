// Gói sự kiện: mỗi thể loại sự kiện (ra mắt sản phẩm, họp báo, thời trang...) là MỘT file trong thư mục này,
// tự chứa tình huống, nhân vật, mục tiêu và cụm mang về. Thêm thể loại mới: tạo file, rồi thêm vào index.ts.
// Ràng buộc được kiểm ở tests/events.test.mjs (npm run test:events).
import type { NpcData, SceneData, TurnData, VoiceConfig } from '../../types/game';
import type { SceneObjective } from '../objectives';

export type EventTheme = 'lounge' | 'conference' | 'runway' | 'concert' | 'wedding' | 'gala';

export interface EventPack {
  scene: SceneData;
  /** Nhân vật riêng của sự kiện (id không trùng với nhân vật đã có) */
  npcs: Record<string, NpcData>;
  objective: SceneObjective;
  /** Ít nhất 2 cụm mang về: [cụm tiếng Anh, nghĩa, tình huống mới để dùng (tiếng Việt), câu mẫu trong tình huống mới] */
  chunks: [en: string, vi: string, useVi: string, sample: string][];
  /** Nhãn thể loại trên màn chính và bối cảnh nền 3D */
  ui: { kind: string; theme: EventTheme };
}

/**
 * Bài bổ sung của một thể loại: cùng nhân vật, tình huống khác hẳn. Viết trong file `<id>.more.ts`.
 * Số lượt phải bằng bài gốc của gói (nhiệm vụ và sổ tay đánh số theo vị trí lượt).
 */
export interface EventScript {
  /** `<id gói>-<tên ngắn>`, ví dụ 'launch-car' */
  id: string;
  /** Tên tình huống bằng tiếng Việt, hiện trong danh sách bài và trên thanh tiêu đề */
  title: string;
  turns: TurnData[];
  chunks: EventPack['chunks'];
}

/** Nhân vật mới. Bản giao diện mới không vẽ nhân vật nên ngoại hình dùng mặc định. */
export function npc(id: string, name: string, role: string, voice: VoiceConfig): NpcData {
  return { id, name, role, voice, look: { skin: '#D9A17C', hair: '#27272A', cloth: '#3F3F46', hairStyle: 'short' as never, outfit: 'suit' as never } };
}

/** Tình huống sự kiện. Các trường của lớp mô phỏng cũ (giờ, năng lượng, tiền) nhận giá trị trung tính. */
export function eventScene(s: {
  id: string;
  kind: string;
  level: 'Beginner+' | 'Intermediate' | 'Advanced';
  reqLv: number;
  minRep?: number;
  title: string;
  sub: string;
  npc: string;
  charisma: number;
  turns: TurnData[];
}): SceneData {
  return {
    id: s.id,
    type: 'show',
    cat: s.kind,
    tag: s.kind,
    tagCls: '',
    tint: '#8A6A2F',
    level: s.level,
    reqLv: s.reqLv,
    ...(s.minRep ? { minRep: s.minRep } : {}),
    icon: '',
    title: s.title,
    sub: s.sub,
    curtain: s.sub,
    art: 'launch',
    npc: s.npc,
    energy: 0,
    reward: { charisma: s.charisma },
    duration: 60,
    turns: s.turns,
  };
}
