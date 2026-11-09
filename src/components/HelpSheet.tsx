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

/** Hướng dẫn chơi: mở từ nút ❓ ở Hub (Cozy Modern Tactile). */
export const HelpSheet: React.FC = () => {
  const helpOpen = useGameStore((s) => s.helpOpen);
  const setHelpOpen = useGameStore((s) => s.setHelpOpen);
  if (!helpOpen) return null;

  const gigs = ['backstage', 'wedding', 'beach', 'gala', 'interview'];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ghibli-ink/20 sm:items-center sm:p-4">
      <div className="cozy-card flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-[#EFE5D4] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFF0D4] text-2xl">
              ❓
            </span>
            <div>
              <h2 className="font-display text-xl font-black text-ghibli-ink">Cẩm Nang MC Thiên Ân</h2>
              <p className="text-xs font-semibold text-ghibli-ink-soft">
                Bí quyết làm chủ sân khấu song ngữ & quản lý lịch trình
              </p>
            </div>
          </div>
          <button
            onClick={() => setHelpOpen(false)}
            className="btn-tactile rounded-full px-3.5 py-1.5 text-xs font-black text-ghibli-ink"
          >
            Đóng ✕
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 text-sm text-ghibli-ink">
          <section className="rounded-2xl bg-[#FAF4E8] p-3.5">
            <h3 className="mb-1 font-display text-sm font-black uppercase tracking-wider text-[#C83E6B]">
              🌟 Mục tiêu Sự nghiệp
            </h3>
            <p className="text-xs font-semibold leading-relaxed text-ghibli-ink">
              Bạn vào vai MC Thiên Ân. Mỗi ngày, hãy nhận và dẫn show, luyện nói tiếng Anh, và
              tăng Charisma để lên cấp. Không có giới hạn thời gian: bạn tự quyết định làm gì trước.
            </p>
          </section>

          <section className="rounded-2xl bg-[#FAF4E8] p-3.5">
            <h3 className="mb-2 font-display text-sm font-black uppercase tracking-wider text-[#1F7A73]">
              📊 Các chỉ số chính
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {STATS.map((s) => (
                <div key={s.name} className="rounded-xl bg-white p-2.5 text-xs">
                  <div className="font-black text-ghibli-ink">
                    {s.icon} {s.name}
                  </div>
                  <p className="mt-0.5 text-ghibli-ink-soft">{s.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl bg-[#FAF4E8] p-3.5">
            <h3 className="mb-1 font-display text-sm font-black uppercase tracking-wider text-[#9C5B00]">
              🕒 Thời gian & Lịch trình
            </h3>
            <p className="text-xs font-semibold leading-relaxed text-ghibli-ink">
              Đồng hồ chỉ chạy khi bạn đi bộ, làm một hoạt động, hoặc bấm ⏩ Chờ đến. Đến trễ show
              sẽ bị trừ tiền, nên hãy tới sớm. Đến 24:00 bạn sẽ ngất và tự động đi ngủ.
            </p>
          </section>

          <section className="rounded-2xl bg-[#FAF4E8] p-3.5">
            <h3 className="mb-2 font-display text-sm font-black uppercase tracking-wider text-[#6535C4]">
              🎙️ Năm kiểu lượt diễn trên sân khấu
            </h3>
            <ul className="space-y-1.5 text-xs">
              {MODES.map((m) => (
                <li key={m.name}>
                  <span className="font-black text-ghibli-ink">• {m.name}:</span>{' '}
                  <span className="text-ghibli-ink-soft">{m.desc}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl bg-[#FAF4E8] p-3.5">
            <h3 className="mb-2 font-display text-sm font-black uppercase tracking-wider text-[#2C731D]">
              🔓 Điều kiện mở khóa Show
            </h3>
            <ul className="space-y-1 text-xs">
              {gigs.map((id) => {
                const sc = SCENES[id];
                if (!sc) return null;
                return (
                  <li key={id}>
                    <span className="font-black text-ghibli-ink">
                      {sc.icon} {sc.title}:
                    </span>{' '}
                    <span className="text-ghibli-ink-soft">
                      cần Lv.{sc.reqLv} ({levelTitle(sc.reqLv)})
                      {sc.minRep ? ` và ⭐${sc.minRep.toFixed(1)} danh tiếng` : ''}.
                    </span>
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
