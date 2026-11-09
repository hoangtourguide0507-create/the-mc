import React from 'react';
import { SCENES } from '../data/content';
import { levelTitle } from '../core/career';
import { useGameStore } from '../core/store';

const STATS: { icon: string; name: string; desc: string }[] = [
  { icon: '⚡', name: 'Năng lượng', desc: 'Mỗi show tốn 20 ⚡. Cà phê và chợ hồi ⚡ mỗi ngày; đi ngủ hồi lại phần lớn ⚡ (60% nếu bị ngất lúc 24:00).' },
  { icon: '🎤', name: 'Charisma', desc: 'Tăng khi dẫn show và hoạt động. Đủ điểm sẽ lên cấp và mở show lớn hơn.' },
  { icon: '📈', name: 'XP', desc: 'Nhận khi luyện nói và nghe đúng. Dùng để nâng kỹ năng tiếng Anh.' },
  { icon: '💰', name: 'Tiền', desc: 'Nhận từ show. Dùng ở Cửa Hàng MC để mua trang bị và nạp ⚡.' },
];

const MODES: { name: string; desc: string }[] = [
  { name: 'Cue card', desc: 'Đọc câu có sẵn. Có thể nghe mẫu trước khi nói.' },
  { name: 'Catch', desc: 'Nghe NPC nói, chạm đúng các từ còn thiếu, rồi mới mở mic đọc cả câu.' },
  { name: 'Semi', desc: 'Ghép câu từ các ô gợi ý theo khung cho sẵn.' },
  { name: 'Free', desc: 'Tự nói theo nhiệm vụ, phải có các từ bắt buộc.' },
  { name: 'Quiz', desc: 'Nghe xong chọn đáp án đúng, càng nhanh càng được nhiều sao.' },
];

/** Hướng dẫn chơi: mở từ nút ❓ ở Hub. */
export const HelpSheet: React.FC = () => {
  const helpOpen = useGameStore((s) => s.helpOpen);
  const setHelpOpen = useGameStore((s) => s.setHelpOpen);
  if (!helpOpen) return null;

  const gigs = ['backstage', 'wedding', 'beach', 'gala', 'interview'];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ghibli-ink/40 sm:items-center sm:p-4">
 <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border ghibli-panel shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-ghibli-track px-5 py-4">
          <h2 className="font-display text-xl font-black text-ghibli-ink">❓ Hướng dẫn chơi</h2>
          <button
            onClick={() => setHelpOpen(false)}
 className="rounded-full ghibli-panel px-3 py-1.5 text-xs font-black text-ghibli-ink hover:ghibli-panel"
          >
            Đóng ✕
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4 text-sm text-ghibli-ink">
          <section>
            <h3 className="mb-1 font-display font-black text-pink-700">Mục tiêu</h3>
            <p>
              Bạn vào vai MC Thiên Ân. Mỗi ngày, hãy nhận và dẫn show, luyện nói tiếng Anh, và
              tăng Charisma để lên cấp. Không có giới hạn thời gian: bạn tự quyết định làm gì trước.
            </p>
          </section>

          <section>
            <h3 className="mb-1 font-display font-black text-pink-700">Các chỉ số</h3>
            <ul className="space-y-1.5">
              {STATS.map((s) => (
                <li key={s.name}>
                  <span className="font-black text-ghibli-ink">
                    {s.icon} {s.name}:
                  </span>{' '}
                  {s.desc}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="mb-1 font-display font-black text-pink-700">Thời gian</h3>
            <p>
              Đồng hồ chỉ chạy khi bạn đi bộ, làm một hoạt động, hoặc bấm ⏩ Chờ đến. Đến trễ show
              sẽ bị trừ tiền, nên hãy tới sớm. Đến 24:00 bạn sẽ ngất và tự động đi ngủ.
            </p>
          </section>

          <section>
            <h3 className="mb-1 font-display font-black text-pink-700">Năm kiểu lượt diễn</h3>
            <ul className="space-y-1.5">
              {MODES.map((m) => (
                <li key={m.name}>
                  <span className="font-black text-ghibli-ink">{m.name}:</span> {m.desc}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-ghibli-ink-soft">
              Trong lượt diễn: 🔊 nghe mẫu, 🐢 nghe chậm, 👁️ hiện chữ (ít XP hơn), 🎙️ bấm để nói.
              Cần đạt ít nhất 1★ mới bấm được Tiếp tục.
            </p>
          </section>

          <section>
            <h3 className="mb-1 font-display font-black text-pink-700">Mở khóa show</h3>
            <ul className="space-y-1.5">
              {gigs.map((id) => {
                const sc = SCENES[id];
                if (!sc) return null;
                return (
                  <li key={id}>
                    <span className="font-black text-ghibli-ink">{sc.title}:</span> cần Lv.{sc.reqLv} (
                    {levelTitle(sc.reqLv)})
                    {sc.minRep ? ` và ⭐${sc.minRep.toFixed(1)} danh tiếng` : ''}.
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};
