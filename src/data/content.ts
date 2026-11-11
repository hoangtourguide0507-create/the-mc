import {
  LookConfig,
  NpcData,
  SceneData,
  ScheduleSlot,
  ShopItem,
  StreetTalkItem,
  TurnData,
  WorldLocation,
} from '../types/game';
import { STREET_TALK_EXTRA } from './streetTalkExtra';
import { STREET_TALK_EXTRA_2 } from './streetTalkExtra2';
import { STREET_TALK_EXTRA_3 } from './streetTalkExtra3';
import { STREET_TALK_EXTRA_4 } from './streetTalkExtra4';
import { STREET_TALK_EXTRA_5 } from './streetTalkExtra5';
import { STREET_TALK_EXTRA_6 } from './streetTalkExtra6';
import { STREET_TALK_EXTRA_7 } from './streetTalkExtra7';
import { STREET_TALK_EXTRA_8 } from './streetTalkExtra8';
import { STREET_TALK_EXTRA_9 } from './streetTalkExtra9';
import { STREET_TALK_EXTRA_10 } from './streetTalkExtra10';
import { DAILY_GENERATORS } from './dailyGen';
import { SHOW_GENERATORS } from './showGen';
import { SCENARIOS, type Scenario } from './scenarios';
import { EVENT_NPCS, EVENT_SCENES } from './events';

export const APP_VERSION = '2026.11.08-3d2';

export const GIG_ORDER = ['backstage', 'wedding', 'beach', 'gala', 'interview'] as const;
export const DAILY_ID = 'coffee';

export const SCHEDULE: Record<string, ScheduleSlot> = {
  coffee: { type: 'daily', open: 420, close: 660 }, // 07:00 - 11:00
  market: { type: 'daily', open: 480, close: 1260 }, // 08:00 - 21:00
  backstage: { type: 'show', start: 900 }, // 15:00
  beach: { type: 'show', start: 1050 }, // 17:30
  wedding: { type: 'show', start: 1110 }, // 18:30
  gala: { type: 'show', start: 1140 }, // 19:00
  interview: { type: 'show', start: 1200 }, // 20:00
};

export const SHOP: ShopItem[] = [
  {
    id: 'icecoffee',
    name: 'Cà phê sữa đá',
    sub: 'Tỉnh táo tức thì trước giờ lên sân khấu',
    type: 'consumable',
    price: 15,
    icon: '🧋',
    energy: 20,
  },
  {
    id: 'pho',
    name: 'Tô phở bò tái',
    sub: 'Ấm bụng, nạp năng lượng bền bỉ cả buổi',
    type: 'consumable',
    price: 35,
    icon: '🍜',
    energy: 45,
  },
  {
    id: 'spa',
    name: 'Massage cổ vai gáy',
    sub: 'Phục hồi 100% năng lượng sau lịch chạy show',
    type: 'consumable',
    price: 90,
    icon: '💆‍♀️',
    energy: 100,
  },
  {
    id: 'goldmic',
    name: 'Micro Vàng',
    sub: '+15% Cát-xê mọi show · Đổi đạo cụ Micro Vàng 3D',
    type: 'upgrade',
    price: 300,
    icon: '🎙️',
    bonus: { cash: 0.15 },
  },
  {
    id: 'gown',
    name: 'Váy Dạ Hội',
    sub: '+20% Charisma · Khoác trang phục Nhung Đỏ Rượu 3D',
    type: 'upgrade',
    price: 450,
    icon: '👗',
    bonus: { cha: 0.2 },
  },
  {
    id: 'inear',
    name: 'Tai nghe In-ear',
    sub: '+20% XP · Hiện chữ ở Quiz không bị giới hạn 2 sao',
    type: 'upgrade',
    price: 250,
    icon: '🎧',
    bonus: { xp: 0.2, inear: true },
  },
];

/**
 * Mô hình VRM anime (tạo bằng VRoid Studio) cho từng nhân vật.
 * Đặt file vào public/vrm/ rồi điền đường dẫn, ví dụ: mc: 'vrm/mc.vrm', emma: 'vrm/emma.vrm'.
 * Để trống = dùng nhân vật anime chibi dựng bằng code.
 */
export const VRM_MODELS: Record<string, string> = {
  mc: 'vrm/mc.vrm',
  // leo: 'vrm/leo.vrm',
  // alex: 'vrm/alex.vrm',
  // emma: 'vrm/emma.vrm',
  // liam: 'vrm/liam.vrm',
  // victoria: 'vrm/victoria.vrm',
  // sam: 'vrm/sam.vrm',
  // tom: 'vrm/tom.vrm',
  // ivy: 'vrm/ivy.vrm',
  // david: 'vrm/david.vrm',
};

export function getPlayerLook(items: Record<string, boolean>): LookConfig {
  return {
    vrmUrl: VRM_MODELS.mc || undefined,
    skin: '#FAD2B8',
    hair: '#231829',
    eye: '#2A1E3F',
    cloth: items.gown ? '#9E1946' : '#1E2952',
    accent: items.gown ? '#FBBF24' : '#38BDF8',
    lip: '#E15B7E',
    hairStyle: 'swoop',
    outfit: items.gown ? 'velvet' : 'tux',
    acc: items.inear ? ['inear', 'earrings'] : ['earrings'],
    lashes: true,
    propArt: items.goldmic ? 'goldmic' : 'mic',
  };
}

export const NPCS: Record<string, NpcData> = {
  leo: {
    id: 'leo',
    name: 'Leo',
    role: 'Barista · Specialty Coffee',
    voice: { lang: 'en-AU', gender: 'm', pitch: 1.02, rate: 0.96 },
    look: {
      skin: '#F3C3A1',
      hair: '#6B3E26',
      eye: '#3B281E',
      cloth: '#2D6A4F',
      accent: '#D8F3DC',
      hairStyle: 'curly',
      outfit: 'apron',
      acc: ['beard'],
      beard: '#5A321E',
      propArt: 'cup',
    },
  },
  alex: {
    id: 'alex',
    name: 'Alex',
    role: 'Stage Director',
    voice: { lang: 'en-US', gender: 'm', pitch: 0.95, rate: 0.98 },
    look: {
      skin: '#E8B490',
      hair: '#1F242D',
      eye: '#1E293B',
      cloth: '#1E293B',
      accent: '#22D3EE',
      hairStyle: 'crew',
      outfit: 'jacket',
      acc: ['headset', 'glasses'],
      propArt: 'clipboard',
    },
  },
  couple: {
    id: 'couple',
    name: 'Emma & Liam',
    role: 'Cô Dâu & Chú Rể',
    voice: { lang: 'en-GB', gender: 'f', pitch: 1.06, rate: 0.95 },
    isCouple: true,
    look: {
      skin: '#FCE0CE',
      hair: '#D99B52',
      eye: '#2563EB',
      cloth: '#FFFDF9',
      accent: '#F472B6',
      hairStyle: 'veil',
      outfit: 'bride',
      lashes: true,
      acc: ['pearls'],
      propArt: 'bouquet',
    },
    coupleLooks: {
      emma: {
        skin: '#FCE0CE',
        hair: '#D99B52',
        eye: '#2563EB',
        cloth: '#FFFDF9',
        accent: '#F472B6',
        hairStyle: 'veil',
        outfit: 'bride',
        lashes: true,
        acc: ['pearls'],
        propArt: 'bouquet',
      },
      liam: {
        skin: '#F2C5A8',
        hair: '#4A3222',
        eye: '#1E3A8A',
        cloth: '#1E293B',
        accent: '#F43F5E',
        hairStyle: 'side',
        outfit: 'tux',
        acc: ['flower'],
      },
    },
    coupleVoices: {
      emma: { lang: 'en-GB', gender: 'f', pitch: 1.08, rate: 0.95 },
      liam: { lang: 'en-GB', gender: 'm', pitch: 0.94, rate: 0.95 },
    },
  },
  victoria: {
    id: 'victoria',
    name: 'Victoria',
    role: 'Gala VIP · Chairwoman',
    voice: { lang: 'en-GB', gender: 'f', pitch: 0.98, rate: 0.97 },
    look: {
      skin: '#F8D5C2',
      hair: '#3B1F2B',
      eye: '#4C1D95',
      cloth: '#7C2D12',
      accent: '#FBBF24',
      lip: '#BE123C',
      hairStyle: 'updo',
      outfit: 'gown',
      lashes: true,
      acc: ['pearls', 'earrings'],
    },
  },
  sam: {
    id: 'sam',
    name: 'Sam',
    role: 'Sound Engineer',
    voice: { lang: 'en-US', gender: 'm', pitch: 0.92, rate: 0.96 },
    look: {
      skin: '#D9A17C',
      hair: '#27272A',
      eye: '#18181B',
      cloth: '#3F3F46',
      accent: '#A855F7',
      hat: '#7C3AED',
      hairStyle: 'beanie',
      outfit: 'hoodie',
      acc: ['phones'],
      propArt: 'tablet',
    },
  },
  tom: {
    id: 'tom',
    name: 'Tom',
    role: 'Store Clerk · Fresh Mart',
    voice: { lang: 'en-US', gender: 'm', pitch: 1.04, rate: 0.95 },
    look: {
      skin: '#F5CBA7',
      hair: '#8D5524',
      eye: '#2E4053',
      cloth: '#0284C7',
      accent: '#BAE6FD',
      hairStyle: 'side',
      outfit: 'apron',
      propArt: 'clipboard',
    },
  },
  ivy: {
    id: 'ivy',
    name: 'Ivy',
    role: 'Beach Wedding Planner',
    voice: { lang: 'en-AU', gender: 'f', pitch: 1.06, rate: 0.97 },
    look: {
      skin: '#F2C19E',
      hair: '#9A3412',
      eye: '#0D9488',
      cloth: '#0EA5E9',
      accent: '#FDE047',
      hairStyle: 'long',
      outfit: 'blouse',
      lashes: true,
      acc: ['headset', 'flower'],
      propArt: 'tablet',
    },
  },
  david: {
    id: 'david',
    name: 'Mr. Tran (David)',
    role: 'Tech CEO & Keynote Speaker',
    voice: { lang: 'en-US', gender: 'm', pitch: 0.9, rate: 0.98 },
    look: {
      skin: '#EBC19D',
      hair: '#1E293B',
      eye: '#0F172A',
      cloth: '#0F172A',
      accent: '#38BDF8',
      hairStyle: 'side',
      outfit: 'suit',
      acc: ['glasses'],
      propArt: 'mic',
    },
  },
  grandpa: {
    id: 'grandpa',
    name: 'Ông Minh (Grandpa)',
    role: 'Khách mời · Ông nội cô dâu',
    voice: { lang: 'en-US', gender: 'm', pitch: 0.92, rate: 0.9 },
    look: {
      skin: '#E8B490',
      hair: '#B8B8B8',
      eye: '#3F3F46',
      cloth: '#4B5563',
      accent: '#E5E7EB',
      hairStyle: 'crew',
      outfit: 'suit',
      acc: ['glasses'],
    },
  },
  grandma: {
    id: 'grandma',
    name: 'Bà Lan (Grandma)',
    role: 'Khách mời · Bà nội cô dâu',
    voice: { lang: 'en-US', gender: 'f', pitch: 1.0, rate: 0.9 },
    look: {
      skin: '#F2C19E',
      hair: '#D1D5DB',
      eye: '#334155',
      cloth: '#9D174D',
      accent: '#FBCFE8',
      hairStyle: 'updo',
      outfit: 'blouse',
      acc: ['pearls', 'glasses'],
    },
  },
  boy: {
    id: 'boy',
    name: 'Bé Bi (Ring Bearer)',
    role: 'Bé trai · Cầm nhẫn',
    voice: { lang: 'en-US', gender: 'm', pitch: 1.2, rate: 1.05 },
    look: {
      skin: '#F3C3A1',
      hair: '#3B2A1E',
      eye: '#1E293B',
      cloth: '#1D4ED8',
      accent: '#FDE047',
      hairStyle: 'crew',
      outfit: 'tux',
      acc: [],
    },
  },
  girl: {
    id: 'girl',
    name: 'Bé Na (Flower Girl)',
    role: 'Bé gái · Rải hoa',
    voice: { lang: 'en-US', gender: 'f', pitch: 1.25, rate: 1.05 },
    look: {
      skin: '#F2C19E',
      hair: '#7C2D12',
      eye: '#0F172A',
      cloth: '#F472B6',
      accent: '#FDE047',
      hairStyle: 'long',
      outfit: 'gown',
      acc: ['flower'],
      lashes: true,
    },
  },
};

// Gắn mô hình VRM (nếu có) cho NPC
for (const [id, npc] of Object.entries(NPCS)) {
  if (VRM_MODELS[id]) npc.look = { ...npc.look, vrmUrl: VRM_MODELS[id] };
  if (npc.coupleLooks) {
    if (VRM_MODELS.emma) npc.coupleLooks.emma = { ...npc.coupleLooks.emma, vrmUrl: VRM_MODELS.emma };
    if (VRM_MODELS.liam) npc.coupleLooks.liam = { ...npc.coupleLooks.liam, vrmUrl: VRM_MODELS.liam };
  }
}

export const WORLD_LOCS: Record<string, WorldLocation> = {
  home: {
    id: 'home',
    name: 'Nhà MC Thiên Ân',
    icon: '🏠',
    at: [7, 7],
    district: 'center',
    doorFace: 'front-left',
    doorTile: [8, 10],
    scenes: [],
    color: '#6366F1',
    neonColor: '#FF4FD8',
    roofColor: '#4338CA',
  },
  cafe: {
    id: 'cafe',
    name: 'Quán Cà Phê',
    icon: '☕',
    at: [6, 0],
    district: 'center',
    doorFace: 'front-left',
    doorTile: [7, 3],
    scenes: ['coffee'],
    color: '#D97706',
    neonColor: '#FBBF24',
    roofColor: '#92400E',
  },
  market: {
    id: 'market',
    name: 'Siêu Thị FreshMart',
    icon: '🛒',
    at: [0, 13],
    district: 'center',
    doorFace: 'front-right',
    doorTile: [3, 14],
    scenes: ['market'],
    color: '#10B981',
    neonColor: '#7CFF6B',
    roofColor: '#047857',
  },
  theater: {
    id: 'theater',
    name: 'Nhà Hát Thành Phố',
    icon: '🎭',
    at: [9, 0],
    district: 'center',
    doorFace: 'front-left',
    doorTile: [10, 3],
    scenes: ['backstage'],
    color: '#8B5CF6',
    neonColor: '#C084FC',
    roofColor: '#5B21B6',
  },
  wedding: {
    id: 'wedding',
    name: 'Sảnh Tiệc Cưới Hoàng Gia',
    icon: '💍',
    at: [16, 14],
    district: 'night',
    doorFace: 'front-left',
    doorTile: [17, 17],
    scenes: ['wedding'],
    color: '#F43F5E',
    neonColor: '#FF4FD8',
    roofColor: '#BE123C',
  },
  hotel: {
    id: 'hotel',
    name: 'Khách Sạn VIP Gala',
    icon: '🥂',
    at: [16, 7],
    district: 'night',
    doorFace: 'front-left',
    doorTile: [17, 10],
    scenes: ['gala'],
    color: '#EAB308',
    neonColor: '#FDE047',
    roofColor: '#A16207',
  },
  beach: {
    id: 'beach',
    name: 'Bãi Biển Hoàng Hôn',
    icon: '🏖️',
    at: [16, 22],
    district: 'coast',
    doorFace: 'front-right',
    doorTile: [19, 23],
    scenes: ['beach'],
    color: '#06B6D4',
    neonColor: '#22D3EE',
    roofColor: '#0E7490',
  },
  tv: {
    id: 'tv',
    name: 'Đài Truyền Hình',
    icon: '📺',
    at: [15, 0],
    district: 'night',
    doorFace: 'front-left',
    doorTile: [16, 3],
    scenes: ['interview'],
    color: '#3B82F6',
    neonColor: '#22D3EE',
    roofColor: '#1D4ED8',
  },
};

export const PASSER_LOOKS: LookConfig[] = [
  { skin: '#FAD2B8', hair: '#2A1E3F', cloth: '#EC4899', hairStyle: 'long', outfit: 'blouse', lashes: true },
  { skin: '#E8B490', hair: '#4A3222', cloth: '#3B82F6', hairStyle: 'crew', outfit: 'hoodie' },
  { skin: '#FCE0CE', hair: '#D97706', cloth: '#10B981', hairStyle: 'updo', outfit: 'jacket', lashes: true },
  { skin: '#D9A17C', hair: '#18181B', cloth: '#8B5CF6', hairStyle: 'curly', outfit: 'crew', acc: ['glasses'] },
  { skin: '#F5CBA7', hair: '#7C2D12', cloth: '#F59E0B', hairStyle: 'side', outfit: 'suit' },
  { skin: '#F2C19E', hair: '#1E293B', cloth: '#06B6D4', hairStyle: 'swoop', outfit: 'blouse', lashes: true },
  { skin: '#EBC19D', hair: '#3B281E', cloth: '#EF4444', hairStyle: 'beanie', hat: '#EF4444', outfit: 'hoodie' },
  { skin: '#F8D5C2', hair: '#9A3412', cloth: '#6366F1', hairStyle: 'long', outfit: 'velvet', lashes: true },
];

export const WM_NAMES = ['Mia', 'Noah', 'Chloe', 'Ethan', 'Sophia', 'Lucas', 'Zoe', 'Mason', 'Lily', 'Oliver', 'Ava', 'Leo'];

export const BLESSINGS = [
  'eternal love',
  'endless laughter',
  'a lifetime of happiness',
  'unbreakable bond',
  'warmth and harmony',
  'sweet memories',
  'joyful adventures',
  'forever and always',
];

export const STARTER = [
  {
    id: 'starter-1',
    en: 'Good evening, ladies and gentlemen! Welcome to our special night.',
    vi: 'Chào buổi tối quý vị! Chào mừng đến với đêm đặc biệt của chúng ta.',
    cat: 'Cơ bản',
  },
  {
    id: 'starter-2',
    en: 'Please give a warm round of applause for our guests of honor!',
    vi: 'Xin dành một tràng pháo tay nồng nhiệt cho các vị khách danh dự của chúng ta!',
    cat: 'Cơ bản',
  },
  {
    id: 'starter-3',
    en: 'Thank you so much for your patience. We will begin in just a moment.',
    vi: 'Cảm ơn sự kiên nhẫn của quý vị. Chúng ta sẽ bắt đầu ngay sau đây.',
    cat: 'Cơ bản',
  },
  {
    id: 'starter-4',
    en: 'Let us raise our glasses to love, laughter, and happily ever after!',
    vi: 'Hãy cùng nâng ly vì tình yêu, tiếng cười và hạnh phúc mãi mãi về sau!',
    cat: 'Cơ bản',
  },
  {
    id: 'starter-5',
    en: 'Without further ado, let us welcome our keynote speaker to the stage!',
    vi: 'Không để quý vị chờ lâu hơn nữa, hãy cùng chào đón diễn giả chính lên sân khấu!',
    cat: 'Cơ bản',
  },
];

export const TIPS = [
  '💡 Nhấn mạnh vào các động từ và tính từ cảm xúc (warm, thrilled, honored) để giọng dẫn truyền cảm hơn!',
  '🎧 Không bấm "Hiện chữ" ở lượt đầu giúp bạn nhận gấp đôi (×2) điểm Listening XP!',
  '⏰ Các show mở cửa trước 60 phút. Đến trễ quá 5 phút sẽ bị trừ cát-xê 1,2% mỗi phút!',
  '🎙️ Mua Tai nghe In-ear ở Cửa hàng giúp bạn xem chữ ở lượt Quiz mà không bị giới hạn 2 sao.',
  '☕ Hai hoạt động Daily (Cà phê sáng & Siêu thị) hoàn toàn miễn phí và giúp hồi lại Năng lượng!',
];

const rawScenes: Record<string, SceneData> = {
  coffee: {
    id: 'coffee',
    type: 'daily',
    cat: 'Daily',
    tag: 'Daily · Free ⚡',
    tagCls: 'bg-amber-500/20 text-amber-300 border-amber-400/40',
    tint: '#F59E0B',
    level: 'Beginner',
    reqLv: 1,
    icon: '☕',
    title: 'Morning Coffee Run',
    sub: '07:00 – 11:00 · Khởi động giọng buổi sáng tại quán quen của Leo',
    curtain: 'Hương cà phê rang mới thoang thoảng trong nắng sớm...',
    art: 'cafe',
    npc: 'leo',
    energy: 0,
    reward: { charisma: 8, energy: 25 },
    duration: 30,
    turns: [
      {
        mode: 'scripted',
        npc: 'Morning, Thien An! Big day of hosting ahead? What can I get started for you today?',
        npcVi: 'Chào buổi sáng, Thiên Ân! Hôm nay lại chạy show lớn hả? Tôi làm món gì cho bạn đây?',
        cue: 'Good morning, Leo! Could I get an iced oat latte with less ice, please?',
        cueVi: 'Chào buổi sáng Leo! Cho mình một ly latte yến mạch đá, ít đá nhé?',
        key: 'iced oat latte with less ice',
        tip: 'Lên giọng nhẹ ở chữ "please" cuối câu để lời gọi món nghe thân thiện, lịch sự.',
      },
      {
        mode: 'catch',
        npc: 'You got it! Would you like a warm almond croissant or a blueberry muffin on the side?',
        npcVi: 'Có ngay! Bạn có muốn dùng kèm bánh sừng bò hạnh nhân ấm hay bánh muffin việt quất không?',
        cue: 'I will take a {warm} almond {croissant} to go, thank you!',
        cueVi: 'Mình lấy một chiếc bánh sừng bò hạnh nhân ấm mang đi nhé, cảm ơn bạn!',
        catch: ['cold', 'bagel', 'sweet', 'muffin'],
        key: 'warm almond croissant to go',
        tip: 'Nghe kỹ tính từ và tên món bánh Leo vừa gợi ý để bắt đúng thẻ từ.',
      },
      {
        mode: 'semi',
        npc: 'That comes to nine dollars even. How are your vocal cords feeling before tonight’s show?',
        npcVi: 'Tổng cộng 9 đô chẵn nhé. Dây thanh quản của bạn thế nào trước show tối nay?',
        frame: 'Here you go! Honestly, I feel ___ and ready to ___ the stage tonight!',
        cueVi: 'Của bạn đây! Thật sự hôm nay mình cảm thấy ___ và sẵn sàng ___ sân khấu tối nay!',
        blanks: 2,
        blankPool: [
          ['energized', 'excited', 'great', 'confident', 'awesome'],
          ['rock', 'shine', 'host', 'light up', 'own'],
        ],
        sample: 'Here you go! Honestly, I feel energized and ready to rock the stage tonight!',
        key: 'feel energized and ready to rock',
        tip: 'Điền tính từ chỉ sự hào hứng ở ô 1 và động từ làm chủ sân khấu ở ô 2.',
      },
      {
        mode: 'scripted',
        npc: 'Here is your latte! Break a leg tonight, MC Thien An!',
        npcVi: 'Latte của bạn đây! Tối nay dẫn thật bùng nổ nhé, MC Thiên Ân!',
        cue: 'Thanks a million, Leo! Have a wonderful morning shift!',
        cueVi: 'Cảm ơn Leo rất nhiều! Chúc bạn ca sáng thật tuyệt vời nhé!',
        key: 'Have a wonderful morning shift',
        tip: '"Break a leg" là lời chúc may mắn trong giới sân khấu. Hãy đáp lại thật rạng rỡ!',
      },
      {
        mode: 'scripted',
        who: 'grandma',
        npc: 'Good morning, dear! I would like a cup of chamomile tea, not too hot, please.',
        npcVi: 'Chào cháu! Bà muốn một tách trà hoa cúc, đừng nóng quá nhé.',
        cue: 'Good morning, ma’am! Chamomile tea coming right up, and I will keep it just warm enough.',
        cueVi: 'Chào bà! Trà hoa cúc đây ạ, cháu sẽ pha vừa ấm thôi ạ.',
        key: 'chamomile tea coming right up',
        tip: 'Giọng lễ phép, nhẹ nhàng khi phục vụ người lớn tuổi.',
      },
    ],
  },
  market: {
    id: 'market',
    type: 'daily',
    cat: 'Daily',
    tag: 'Daily · Free ⚡',
    tagCls: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40',
    tint: '#10B981',
    level: 'Beginner',
    reqLv: 1,
    icon: '🛒',
    title: 'Supermarket Run',
    sub: '08:00 – 21:00 · Mua đồ dưỡng giọng và thức ăn nhẹ tại siêu thị',
    curtain: 'Bước vào FreshMart mát lạnh giữa ngày bận rộn...',
    art: 'market',
    npc: 'tom',
    energy: 0,
    reward: { charisma: 8, energy: 25 },
    duration: 30,
    turns: [
      {
        mode: 'scripted',
        npc: 'Welcome to FreshMart! Are you looking for anything in particular today?',
        npcVi: 'Chào mừng đến với FreshMart! Hôm nay bạn đang tìm mua món gì đặc biệt không?',
        cue: 'Hi Tom! Excuse me, which aisle can I find herbal throat lozenges and honey?',
        cueVi: 'Chào Tom! Cho mình hỏi quầy nào có kẹo ngậm thảo mộc dịu họng và mật ong nhỉ?',
        key: 'which aisle can I find herbal throat lozenges',
        tip: 'Đọc rõ "aisle" (/aɪl/ - âm s câm) và "lozenges" (/ˈlɒzɪndʒɪz/).',
      },
      {
        mode: 'catch',
        npc: 'Organic honey and throat drops are right over on aisle four, next to the sparkling water.',
        npcVi: 'Mật ong hữu cơ và kẹo ngậm ở ngay dãy số 4, cạnh quầy nước khoáng có ga nhé.',
        cue: 'Perfect! I will grab the {organic} honey on {aisle} four right now.',
        cueVi: 'Tuyệt quá! Mình sẽ qua dãy số 4 lấy mật ong hữu cơ ngay đây.',
        catch: ['regular', 'counter', 'shelf', 'seven'],
        key: 'organic honey on aisle four',
        tip: 'Chú ý nghe số dãy hàng (aisle four) và loại mật ong (organic).',
      },
      {
        mode: 'quiz',
        npc: 'Would you like paper or plastic bags today? Also, we have a buy-one-get-one deal on chamomile tea!',
        npcVi: 'Hôm nay bạn muốn dùng túi giấy hay túi nhựa? À, trà hoa cúc đang có khuyến mãi mua 1 tặng 1 đấy!',
        question: 'Tom vừa thông báo ưu đãi gì ở quầy thu ngân?',
        options: [
          { t: 'I brought my own reusable bag, and yes, I would love the chamomile tea deal!', ok: true },
          { t: 'No thanks, I do not need any coffee beans today.', ok: false },
          { t: 'Could you tell me when the supermarket closes tonight?', ok: false },
        ],
        cueVi: 'Mình có mang túi vải riêng rồi, và cho mình lấy ưu đãi trà hoa cúc nhé!',
        tip: 'Lắng nghe cụm "buy-one-get-one deal on chamomile tea".',
      },
      {
        mode: 'scripted',
        npc: 'Your total is fourteen fifty. Would you like to pay by card or tap your phone?',
        npcVi: 'Tổng của bạn là 14 đô 50 xu. Bạn muốn quẹt thẻ hay chạm điện thoại?',
        cue: 'I will tap my phone to pay. Thank you for your help today, Tom!',
        cueVi: 'Mình sẽ chạm điện thoại để thanh toán. Cảm ơn sự giúp đỡ của bạn hôm nay nhé Tom!',
        key: 'tap my phone to pay',
        tip: 'Nói mạch lạc cụm "tap my phone to pay" như giao tiếp đời thực.',
      },
      {
        mode: 'scripted',
        who: 'boy',
        npc: 'Mister, can I pick the candy? I want the bright red one!',
        npcVi: 'Chú ơi, con chọn kẹo được không? Con muốn cái màu đỏ tươi!',
        cue: 'Of course, buddy! The bright red candy is on the bottom shelf, right by the checkout.',
        cueVi: 'Dĩ nhiên rồi nhóc! Kẹo đỏ tươi ở kệ dưới cùng, ngay cạnh quầy thanh toán đó.',
        key: 'bottom shelf, right by the checkout',
        tip: 'Giọng vui vẻ, hướng dẫn rõ ràng khi nói với trẻ nhỏ.',
      },
    ],
  },
  backstage: {
    id: 'backstage',
    type: 'show',
    cat: 'Backstage',
    tag: 'Rehearsal · 15:00',
    tagCls: 'bg-purple-500/20 text-purple-300 border-purple-400/40',
    tint: '#A855F7',
    level: 'Beginner+',
    reqLv: 1,
    icon: '🎧',
    title: 'Rehearsal & Soundcheck',
    sub: '15:00 · Khớp âm thanh, ánh sáng và kịch bản hậu trường cùng Sam & Alex',
    curtain: 'Ánh đèn hậu trường bật sáng — 5 phút trước giờ tổng duyệt...',
    art: 'backstage',
    npc: 'sam',
    energy: 20,
    reward: { cash: 90, charisma: 25 },
    duration: 60,
    turns: [
      {
        mode: 'scripted',
        who: 'sam',
        npc: 'Hey Thien An! Your wireless handheld mic is on channel one. Give me a quick level check!',
        npcVi: 'Chào Thiên Ân! Micro không dây cầm tay của bạn ở kênh 1 nhé. Đọc thử vài câu để tôi chỉnh âm lượng nào!',
        cue: 'Testing one, two, three! Good afternoon everyone, how does the vocal clarity sound from the booth?',
        cueVi: 'Thử máy 1, 2, 3! Chào buổi chiều mọi người, độ trong của giọng đọc nghe từ bàn chỉnh âm thế nào rồi?',
        key: 'how does the vocal clarity sound',
        tip: 'Phát âm dứt khoát "Testing one, two, three" để kỹ thuật viên đo ngưỡng nén âm.',
      },
      {
        mode: 'catch',
        who: 'sam',
        npc: 'There is a slight echo near the front speakers, so hold the microphone closer to your chin.',
        npcVi: 'Có chút tiếng vang ở cụm loa trước, nên bạn hãy cầm micro sát cằm hơn một chút nhé.',
        cue: 'Got it, Sam! I will hold the {microphone} closer to avoid any {echo} on stage.',
        cueVi: 'Rõ rồi Sam! Mình sẽ cầm micro gần hơn để tránh bị vang trên sân khấu.',
        catch: ['spotlight', 'feedback', 'podium', 'delay'],
        key: 'hold the microphone closer to avoid any echo',
        tip: 'Bắt đúng 2 danh từ kỹ thuật âm thanh mà Sam vừa nhắc.',
      },
      {
        mode: 'semi',
        who: 'alex',
        channel: 'inear',
        npc: 'Thien An, this is Alex on your in-ear! The VIP sponsor wants us to highlight their green innovation award right after the opening.',
        npcVi: 'Thiên Ân, Alex nói qua in-ear đây! Nhà tài trợ VIP muốn chúng ta nhấn mạnh giải thưởng Đổi mới Xanh ngay sau phần mở màn.',
        frame: 'Copy that, Alex! Right after the ___, I will spotlight the ___ award!',
        cueVi: 'Rõ rồi Alex! Ngay sau phần ___, mình sẽ làm nổi bật giải thưởng ___!',
        blanks: 2,
        blankPool: [
          ['opening', 'welcome', 'intro', 'introduction'],
          ['green innovation', 'innovation', 'sustainability', 'green'],
        ],
        sample: 'Copy that, Alex! Right after the opening, I will spotlight the green innovation award!',
        key: 'spotlight the green innovation award',
        tip: 'Phản hồi đạo diễn qua tai nghe thật gọn, rõ và chuyên nghiệp.',
      },
      {
        mode: 'free',
        who: 'alex',
        npc: 'Great! Now give me a warm 15-second rehearsal intro welcoming everyone to the City Theater tonight!',
        npcVi: 'Tuyệt! Giờ hãy chạy thử một câu chào mở màn ấm áp mời khán giả đến với Nhà Hát Thành Phố tối nay nào!',
        task: 'Chào mừng khán giả đến với buổi tối đặc biệt tại Nhà Hát Thành Phố và mời mọi người ổn định chỗ ngồi.',
        taskVi: 'Bắt buộc có lời chào (welcome / good evening) và nhắc đến sân khấu/đêm diễn (stage / tonight / theater).',
        requiredKeywords: [
          ['welcome', 'good evening', 'hello'],
          ['tonight', 'stage', 'theater', 'night', 'show'],
        ],
        bonusKeywords: [
          ['seat', 'seats', 'seated'],
          ['applause', 'excited', 'honored', 'special'],
          ['ladies and gentlemen', 'everyone'],
        ],
        sample: 'Good evening ladies and gentlemen, and welcome to the City Theater! Please take your seats as our special show begins tonight!',
        minWords: 10,
        key: 'welcome to the City Theater tonight',
        tip: 'Kết hợp lời chào trang trọng ("Ladies and gentlemen") và mời khán giả ngồi ("take your seats") để lấy trọn 3 sao!',
      },
    ],
  },
  wedding: {
    id: 'wedding',
    type: 'show',
    cat: 'Wedding',
    tag: 'Wedding · 18:30',
    tagCls: 'bg-pink-500/20 text-pink-300 border-pink-400/40',
    tint: '#EC4899',
    level: 'Intermediate',
    reqLv: 3,
    icon: '💍',
    title: 'The Grand Entrance & First Toast',
    sub: '18:30 · Dẫn lễ rước Cô dâu Chú rể Emma & Liam và nghi thức nâng ly',
    curtain: 'Tiếng đàn vĩ cầm ngân vang khắp sảnh tiệc pha lê...',
    art: 'wedding',
    npc: 'couple',
    energy: 20,
    reward: { cash: 220, charisma: 45 },
    duration: 90,
    turns: [
      {
        mode: 'scripted',
        who: 'couple',
        speaker: 'emma',
        npc: 'Oh Thien An, my hands are shaking! Are all the guests seated inside the grand ballroom yet?',
        npcVi: 'Ôi Thiên Ân ơi, tay mình run quá! Khách khứa đã ngồi ổn định hết trong đại sảnh chưa bạn?',
        cue: 'Take a deep breath, Emma! Everyone is seated and ready to celebrate your love story tonight.',
        cueVi: 'Hít một hơi thật sâu nào Emma! Mọi người đã ổn định chỗ ngồi và sẵn sàng chúc mừng câu chuyện tình yêu của hai bạn tối nay rồi.',
        key: 'celebrate your love story tonight',
        tip: 'Trấn an cô dâu bằng tông giọng ấm áp, chậm rãi ở cụm "Take a deep breath".',
      },
      {
        mode: 'scripted',
        who: 'couple',
        speaker: 'liam',
        npc: 'Thanks Thien An! That is our entrance song starting—go ahead and announce us to the room!',
        npcVi: 'Cảm ơn Thiên Ân! Nhạc tiến lễ của tụi mình bắt đầu rồi kìa—bạn ra giới thiệu tụi mình với cả khán phòng nhé!',
        cue: 'Ladies and gentlemen, please rise and put your hands together for the newlyweds, Emma and Liam!',
        cueVi: 'Thưa quý vị, xin hãy cùng đứng lên và dành tràng pháo tay nồng nhiệt nhất cho cặp đôi tân hôn, Emma và Liam!',
        key: 'put your hands together for the newlyweds',
        tip: 'Đẩy cao năng lượng và nhịp điệu ở cụm "newlyweds, Emma and Liam!"',
      },
      {
        mode: 'scripted',
        who: 'grandpa',
        npc: 'Young MC, I have waited all evening for a proper toast. Could you tell us how these two first met?',
        npcVi: 'Cháu MC ơi, ông đợi cả buổi tối để nghe lời chúc đàng hoàng đây. Cháu kể cho ông nghe hai đứa gặp nhau thế nào được không?',
        cue: 'Certainly, sir! Emma and Liam first met in a small bookshop, and their love story has been beautiful ever since.',
        cueVi: 'Dạ được ạ! Emma và Liam gặp nhau ở một hiệu sách nhỏ, và câu chuyện tình yêu của hai bạn từ đó đẹp mãi ạ.',
        key: 'first met in a small bookshop',
        tip: 'Trả lời lịch sự với người lớn tuổi, kể ngắn gọn bằng giọng kể chuyện ấm áp.',
      },
      {
        mode: 'scripted',
        who: 'grandma',
        npc: 'Oh sweetheart, the cake looks lovely, but I cannot quite see it from here. Where is it displayed?',
        npcVi: 'Ôi cháu, cái bánh trông đẹp quá, nhưng bà không thấy rõ từ đây. Bánh đặt ở đâu vậy cháu?',
        cue: 'Of course, ma’am! The wedding cake is right beside the big window, next to the photo wall.',
        cueVi: 'Dạ tất nhiên ạ! Bánh cưới đặt ngay cạnh cửa sổ lớn, bên cạnh tường ảnh ạ.',
        key: 'beside the big window',
        tip: 'Chỉ dẫn rõ ràng, giọng lễ phép với bà.',
      },
      {
        mode: 'scripted',
        who: 'boy',
        npc: 'Mister MC, I am the ring bearer! When do I walk down the aisle?',
        npcVi: 'Chú MC ơi, con là bé cầm nhẫn đấy! Khi nào con đi qua lối đi vậy ạ?',
        cue: 'Great question! You walk down right after the flower girl, so get ready and smile for the guests!',
        cueVi: 'Câu hỏi hay đấy! Con sẽ đi ngay sau bé rải hoa, nên chuẩn bị sẵn sàng và cười thật tươi với quan khách nhé!',
        key: 'right after the flower girl',
        tip: 'Giọng vui vẻ, khích lệ khi nói với trẻ nhỏ; nhấn cụm "right after".',
      },
      {
        mode: 'scripted',
        who: 'girl',
        npc: 'Can I throw the flower petals now? I practiced all week!',
        npcVi: 'Con rải hoa được chưa ạ? Con tập cả tuần rồi đó!',
        cue: 'Yes, sweetheart! Go ahead and throw your petals along the aisle, you look amazing!',
        cueVi: 'Được rồi cháu! Con cứ rải cánh hoa dọc lối đi nhé, con trông tuyệt lắm!',
        key: 'throw your petals along the aisle',
        tip: 'Khen bé bằng giọng ấm, nhịp chậm rãi.',
      },
      {
        mode: 'catch',
        who: 'alex',
        channel: 'inear',
        npc: 'In-ear cue: The champagne glasses are poured! Invite the guests to raise a toast to eternal love and endless laughter.',
        npcVi: 'Nhắc bài qua In-ear: Rượu sâm-panh đã rót xong! Hãy mời quan khách nâng ly chúc cho tình yêu vĩnh cửu và tiếng cười bất tận.',
        cue: 'Everyone, please raise your glasses to {eternal} love and endless {laughter} for our happy couple!',
        cueVi: 'Mọi người ơi, xin hãy nâng ly chúc cho tình yêu vĩnh cửu và tiếng cười bất tận của cặp đôi hạnh phúc!',
        catch: ['temporary', 'silence', 'wealth', 'patience'],
        key: 'raise your glasses to eternal love and endless laughter',
        tip: 'Nghe kỹ chỉ thị qua tai nghe In-ear của đạo diễn Alex để bắt 2 từ khoá lời chúc.',
      },
      {
        mode: 'free',
        who: 'couple',
        speaker: 'emma',
        npc: 'Thank you everyone! Thien An, could you invite our guests to enjoy the wedding banquet and join us on the dance floor later?',
        npcVi: 'Cảm ơn mọi người! Thiên Ân ơi, bạn mời quan khách thưởng thức tiệc cưới và lát nữa cùng ra sàn nhảy với tụi mình nhé?',
        task: 'Gửi lời chúc phúc tới Emma & Liam, mời quan khách thưởng thức bữa tối (dinner/banquet) và chuẩn bị ra sàn nhảy (dance floor).',
        taskVi: 'Bắt buộc nhắc đến bữa tiệc (dinner / banquet / meal / enjoy) và sàn nhảy/âm nhạc (dance / music / celebrate).',
        requiredKeywords: [
          ['enjoy', 'dinner', 'banquet', 'meal', 'feast'],
          ['dance', 'dancing', 'music', 'floor', 'celebrate'],
        ],
        bonusKeywords: [
          ['emma', 'liam', 'couple', 'newlyweds'],
          ['love', 'happiness', 'wonderful', 'night'],
        ],
        sample: 'Wishing Emma and Liam a lifetime of happiness! Please enjoy the delicious wedding dinner, and join us on the dance floor later tonight!',
        minWords: 11,
        key: 'enjoy the wedding dinner and join us on the dance floor',
        tip: 'Nói tự nhiên, kết nối lời chúc cặp đôi với lời mời dùng tiệc & khiêu vũ.',
      },
    ],
  },
  beach: {
    id: 'beach',
    type: 'show',
    cat: 'Wedding',
    tag: 'Beach Show · 17:30',
    tagCls: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40',
    tint: '#06B6D4',
    level: 'Intermediate',
    reqLv: 5,
    minRep: 1.6,
    icon: '🏖️',
    title: 'Sunset Beach Wedding',
    sub: '17:30 · Xử lý gió biển bất chợt và dẫn khoảnh khắc trao lời thề dưới hoàng hôn',
    curtain: 'Sóng biển rì rào dưới ánh hoàng hôn rực sắc cam đào...',
    art: 'beach',
    npc: 'ivy',
    energy: 20,
    reward: { cash: 260, charisma: 50 },
    duration: 90,
    turns: [
      {
        mode: 'scripted',
        who: 'ivy',
        npc: 'Thien An! The ocean breeze is picking up fast, and the sun will dip below the horizon in ten minutes!',
        npcVi: 'Thiên Ân ơi! Gió biển đang mạnh lên nhanh lắm, mà mặt trời sẽ lặn xuống đường chân trời trong 10 phút nữa thôi!',
        cue: 'No worries, Ivy! I will gather the guests by the floral arch right away so we catch the golden hour.',
        cueVi: 'Đừng lo nhé Ivy! Mình sẽ mời khách tập trung quanh cổng hoa ngay lập tức để kịp khoảnh khắc hoàng hôn vàng.',
        key: 'gather the guests by the floral arch',
        tip: 'Giữ nhịp bình tĩnh và rõ ràng để điều phối đám đông ngoài bãi biển.',
      },
      {
        mode: 'catch',
        who: 'ivy',
        npc: 'Please remind everyone to silence their phones and keep the center aisle clear for the photographer!',
        npcVi: 'Nhờ bạn nhắc mọi người chuyển điện thoại sang chế độ im lặng và giữ lối đi giữa thông thoáng cho nhiếp ảnh gia nhé!',
        cue: 'Kindly {silence} your mobile phones and keep the center aisle {clear} for our photographer.',
        cueVi: 'Xin vui lòng tắt chuông điện thoại và giữ lối đi chính thông thoáng cho nhiếp ảnh gia của chúng ta.',
        catch: ['charge', 'crowded', 'open', 'camera'],
        key: 'silence your mobile phones and keep the center aisle clear',
        tip: 'Từ "aisle" tiếp tục xuất hiện — hãy phát âm mượt mà cùng động từ "silence".',
      },
      {
        mode: 'semi',
        who: 'ivy',
        npc: 'The acoustic guitarist is ready. Lead us into the exchange of vows as the waves roll in!',
        npcVi: 'Nghệ sĩ guitar thùng đã sẵn sàng. Hãy dẫn vào nghi thức trao lời thề nguyện khi tiếng sóng vỗ về nhé!',
        frame: 'Beneath this breathtaking ___, let us witness the sacred ___ between two soulmates.',
        cueVi: 'Dưới ánh ___ tuyệt đẹp này, hãy cùng chứng kiến ___ thiêng liêng giữa hai tâm hồn đồng điệu.',
        blanks: 2,
        blankPool: [
          ['sunset', 'sky', 'ocean view', 'twilight'],
          ['vows', 'promise', 'promises', 'moment'],
        ],
        sample: 'Beneath this breathtaking sunset, let us witness the sacred vows between two soulmates.',
        key: 'breathtaking sunset and sacred vows',
        tip: 'Ngân nhẹ chữ "breathtaking sunset" để tạo chất thơ cho lễ cưới bãi biển.',
      },
      {
        mode: 'scripted',
        who: 'ivy',
        npc: 'That was magical! Now invite everyone up to the beachside deck for sunset cocktails!',
        npcVi: 'Khoảnh khắc vừa rồi kỳ diệu thật sự! Giờ hãy mời mọi người lên sân gỗ ven biển thưởng thức cocktail hoàng hôn nhé!',
        cue: 'What a magical moment by the sea! Please join us on the wooden deck for refreshing sunset cocktails!',
        cueVi: 'Thật là một khoảnh khắc kỳ diệu bên bờ biển! Xin mời quý vị cùng lên sân gỗ thưởng thức những ly cocktail hoàng hôn mát lành!',
        key: 'join us on the wooden deck for refreshing sunset cocktails',
        tip: 'Truyền tải năng lượng vui tươi, sảng khoái ở cuối buổi lễ.',
      },
      {
        mode: 'scripted',
        who: 'girl',
        npc: 'Can I help carry the petals? I made a basket all by myself!',
        npcVi: 'Con giúp mọi người mang cánh hoa được không ạ? Con tự làm cái giỏ đó!',
        cue: 'What a lovely basket! Yes, sweetheart, you can carry the petals to the sand near the arch.',
        cueVi: 'Cái giỏ đẹp quá! Được rồi cháu, con mang cánh hoa ra cát gần cổng vòm nhé.',
        key: 'carry the petals',
        tip: 'Khen bé bằng giọng ấm, nhịp chậm rãi.',
      },
    ],
  },
  gala: {
    id: 'gala',
    type: 'show',
    cat: 'VIP Gala',
    tag: 'VIP Gala · 19:00',
    tagCls: 'bg-amber-500/20 text-amber-300 border-amber-400/40',
    tint: '#EAB308',
    level: 'Advanced',
    reqLv: 7,
    minRep: 2.0,
    icon: '🥂',
    title: 'Handling a Stage Delay',
    sub: '19:00 · Ứng biến giữ nhiệt khán phòng thượng lưu khi sự cố kỹ thuật xảy ra',
    curtain: 'Hàng trăm khách VIP dưới ánh đèn chùm pha lê đang dõi về sân khấu...',
    art: 'gala',
    npc: 'victoria',
    energy: 20,
    reward: { cash: 380, charisma: 70 },
    duration: 90,
    turns: [
      {
        mode: 'scripted',
        who: 'victoria',
        npc: 'Thien An, our keynote video screen just froze! We need you to keep the VIP donors engaged for three minutes.',
        npcVi: 'Thiên Ân, màn hình video chính vừa bị đứng hình! Chúng tôi cần bạn giữ sự hào hứng cho các nhà tài trợ VIP trong 3 phút.',
        cue: 'Leave it to me, Madam Victoria. I will engage the audience with a quick interactive story right away.',
        cueVi: 'Cứ giao cho tôi, thưa bà Victoria. Tôi sẽ kết nối khán giả bằng một câu chuyện tương tác ngắn ngay lập tức.',
        key: 'engage the audience with a quick interactive story',
        tip: 'Phong thái đĩnh đạc, tự tin tuyệt đối trước sự cố sân khấu.',
      },
      {
        mode: 'quiz',
        who: 'alex',
        channel: 'inear',
        reflex: 15,
        npc: 'Urgent in-ear update: Do NOT mention the technical glitch! Instead, spotlight the Charity Auction catalog on their tables!',
        npcVi: 'Khẩn cấp qua In-ear: ĐỪNG nhắc đến lỗi kỹ thuật! Thay vào đó hãy hướng sự chú ý vào cuốn Ấn phẩm Đấu giá Từ thiện trên bàn tiệc!',
        question: 'Bạn phải nói gì với khán phòng ngay lúc này (Phản xạ 15s)?',
        options: [
          {
            t: 'While we prepare our next visual showcase, we invite you to preview the exclusive Charity Auction catalog on your tables!',
            ok: true,
          },
          {
            t: 'We apologize because our main LED projector just crashed backstage, please wait five minutes.',
            ok: false,
          },
          {
            t: 'Let us take an unscheduled twenty-minute intermission while the crew fixes the cables.',
            ok: false,
          },
        ],
        cueVi: 'Trong lúc chuẩn bị phần trình chiếu tiếp theo, xin mời quý vị khám phá ấn phẩm Đấu giá Từ thiện đặc biệt ngay trên bàn tiệc!',
        tip: 'Quy tắc vàng của MC Gala: Biến thời gian chờ kỹ thuật thành phần giới thiệu tự nhiên, không làm khách hoang mang!',
      },
      {
        mode: 'semi',
        who: 'victoria',
        npc: 'Brilliant recovery! Every table is looking at the auction items now. Can you highlight how 100% of proceeds support children’s education?',
        npcVi: 'Cứu nguy xuất sắc lắm! Mọi bàn tiệc đều đang xem vật phẩm đấu giá rồi. Bạn hãy nhấn mạnh rằng 100% số tiền thu được sẽ hỗ trợ giáo dục trẻ em nhé!',
        frame: 'Every single contribution tonight goes directly toward empowering ___ and transforming ___ across the country.',
        cueVi: 'Mỗi đóng góp trong đêm nay đều hướng trực tiếp tới việc chắp cánh cho ___ và thay đổi ___ trên khắp cả nước.',
        blanks: 2,
        blankPool: [
          ['education', 'children', 'students', 'young minds'],
          ['lives', 'futures', 'communities', 'dreams'],
        ],
        sample: 'Every single contribution tonight goes directly toward empowering education and transforming futures across the country.',
        key: 'empowering education and transforming futures',
        tip: 'Nhấn giọng ở "Every single contribution" để chạm tới trái tim các nhà hảo tâm.',
      },
      {
        mode: 'free',
        who: 'alex',
        channel: 'inear',
        npc: 'In-ear: The screen is back online! Wrap up smoothly and invite Chairwoman Victoria to the podium!',
        npcVi: 'In-ear: Màn hình hoạt động lại rồi! Hãy kết lại thật mượt và mời Chủ tịch Victoria lên bục phát biểu!',
        task: 'Cảm ơn lòng hảo tâm của quý vị (generosity / thank you) và trân trọng mời Chủ tịch Victoria (Victoria / Chairwoman) lên sân khấu.',
        taskVi: 'Bắt buộc nhắc tới Victoria và lời mời/cảm ơn (welcome / invite / applause / thank). Không nhắc đến lỗi kỹ thuật (glitch/bug).',
        requiredKeywords: [
          ['victoria', 'chairwoman'],
          ['welcome', 'invite', 'stage', 'podium', 'applause'],
        ],
        bonusKeywords: [
          ['generosity', 'support', 'kindness', 'thank'],
          ['honor', 'pleasure', 'distinguished'],
        ],
        forbiddenKeywords: ['glitch', 'broken', 'crashed', 'error'],
        sample: 'Thank you all for your incredible generosity tonight! Now, please join me in welcoming Chairwoman Victoria to the podium!',
        minWords: 10,
        key: 'welcoming Chairwoman Victoria to the podium',
        tip: 'Tuyệt đối không dùng các từ cấm như "glitch", "broken", "error"!',
      },
      {
        mode: 'scripted',
        who: 'grandpa',
        npc: 'Young man, is the donation table near the entrance? I would like to contribute before the speeches.',
        npcVi: 'Cháu ơi, bàn quyên góp có ở gần cổng không? Ông muốn đóng góp trước khi có phát biểu.',
        cue: 'Yes, sir! The donation table is just past the entrance, on your left. Thank you for your generosity!',
        cueVi: 'Dạ có ạ! Bàn quyên góp ở ngay sau cổng, bên tay trái ông. Cảm ơn sự hào phóng của ông ạ!',
        key: 'just past the entrance',
        tip: 'Trả lời kính trọng, cảm ơn sự đóng góp của người lớn tuổi.',
      },
    ],
  },
  interview: {
    id: 'interview',
    type: 'show',
    cat: 'Talkshow',
    tag: 'Live TV · 20:00',
    tagCls: 'bg-blue-500/20 text-blue-300 border-blue-400/40',
    tint: '#3B82F6',
    level: 'Advanced',
    reqLv: 9,
    minRep: 2.4,
    icon: '📺',
    title: 'On-Stage CEO Interview',
    sub: '20:00 · Dẫn Talkshow truyền hình trực tiếp cùng CEO công nghệ Mr. David Tran',
    curtain: 'Đèn báo ON AIR đỏ rực tại trường quay số 1 — 3, 2, 1...',
    art: 'talkshow',
    npc: 'david',
    energy: 20,
    reward: { cash: 420, charisma: 75 },
    duration: 90,
    turns: [
      {
        mode: 'scripted',
        who: 'david',
        npc: 'Good evening, Thien An! It is a pleasure to join you live on English Stage Tonight.',
        npcVi: 'Chào buổi tối, Thiên Ân! Rất hân hạnh được trò chuyện trực tiếp cùng bạn trên chương trình tối nay.',
        cue: 'Welcome to the show, Mr. Tran! Our viewers are eager to hear how artificial intelligence is reshaping education.',
        cueVi: 'Chào mừng ông đến với chương trình, ông Trần! Khán giả đang rất háo hức muốn nghe trí tuệ nhân tạo đang định hình lại giáo dục như thế nào.',
        key: 'artificial intelligence is reshaping education',
        tip: 'Phát âm chuẩn xác cụm "artificial intelligence" (/ˌɑːrtɪˈfɪʃl ɪnˈtelɪdʒəns/).',
      },
      {
        mode: 'quiz',
        who: 'alex',
        channel: 'inear',
        reflex: 15,
        npc: 'Control room in-ear: We only have ninety seconds left before commercial break! Pivot to a concise question about young talent!',
        npcVi: 'Phòng máy nhắc qua In-ear: Chỉ còn 90 giây trước khi cắt quảng cáo! Hãy chuyển nhanh sang câu hỏi ngắn gọn về lời khuyên cho người trẻ!',
        question: 'Bạn chuyển hướng câu hỏi thế nào khi chỉ còn 90 giây (Phản xạ 15s)?',
        options: [
          {
            t: 'Before we head to a quick break, what is your number one piece of advice for young professionals today?',
            ok: true,
          },
          {
            t: 'Can you walk us through the entire twenty-year financial history of your corporation in detail?',
            ok: false,
          },
          {
            t: 'My director says we are out of time so please stop talking right now.',
            ok: false,
          },
        ],
        cueVi: 'Trước khi đến với ít phút giải lao, lời khuyên số một của ông dành cho những người trẻ hôm nay là gì?',
        tip: 'Dùng cụm chuyển ý chuyên nghiệp "Before we head to a quick break..." để khéo léo giới hạn độ dài câu trả lời của khách mời.',
      },
      {
        mode: 'catch',
        who: 'david',
        npc: 'My advice is simple: stay relentlessly curious, embrace lifelong learning, and never fear making mistakes.',
        npcVi: 'Lời khuyên của tôi rất đơn giản: hãy luôn tò mò không ngừng, đón nhận việc học tập suốt đời và đừng bao giờ sợ mắc sai lầm.',
        cue: 'Stay relentlessly {curious} and embrace {lifelong} learning—what an inspiring message for our audience!',
        cueVi: 'Luôn tò mò không ngừng và đón nhận việc học suốt đời—thật là một thông điệp truyền cảm hứng cho khán giả của chúng ta!',
        catch: ['cautious', 'instant', 'temporary', 'nervous'],
        key: 'relentlessly curious and embrace lifelong learning',
        tip: 'Kỹ thuật Active Listening của MC Talkshow: Nhắc lại (echo) từ khoá đắt giá nhất của khách mời.',
      },
      {
        mode: 'free',
        who: 'david',
        npc: 'Thank you for having me, Thien An! This was one of the most enjoyable interviews I have done all year.',
        npcVi: 'Cảm ơn vì đã mời tôi, Thiên Ân! Đây là một trong những buổi phỏng vấn thú vị nhất của tôi trong cả năm qua.',
        task: 'Cảm ơn CEO David Tran vì buổi chia sẻ sâu sắc và chào tạm biệt khán giả truyền hình (viewers / audience / goodnight).',
        taskVi: 'Bắt buộc cảm ơn khách mời (thank / David / Tran) và chào kết chương trình tới khán giả (viewers / audience / see you / goodnight).',
        requiredKeywords: [
          ['thank', 'thanks', 'pleasure', 'grateful'],
          ['viewers', 'audience', 'watching', 'goodnight', 'night', 'next time'],
        ],
        bonusKeywords: [
          ['david', 'tran', 'inspiring', 'insightful'],
          ['wonderful', 'evening', 'stay tuned'],
        ],
        sample: 'Thank you so much for your inspiring insights, Mr. Tran! And thank you to all our viewers for watching—have a wonderful night!',
        minWords: 11,
        key: 'thank you to all our viewers for watching',
        tip: 'Kết nối khách mời và khán giả nhìn thẳng vào ống kính máy quay chính!',
      },
    ],
  },
};

// Preprocess catch turns just like the original engine: extract {word} into catchAnswers and strip braces from cue
function prepareTurns(turns: TurnData[]): TurnData[] {
  return turns.map((t) => {
    if (t.cue && t.cue.includes('{')) {
      const answers: string[] = [];
      const cleanCue = t.cue.replace(/\{([^}]+)\}/g, (_, word) => {
        answers.push(word);
        return word;
      });
      return {
        ...t,
        mode: 'catch',
        cueRaw: t.cue,
        cue: cleanCue,
        catchAnswers: answers,
      };
    }
    return {
      ...t,
      mode: t.mode || 'scripted',
    };
  });
}

function prepareScenes(scenes: Record<string, SceneData>): Record<string, SceneData> {
  const out: Record<string, SceneData> = {};
  for (const [id, scene] of Object.entries(scenes)) {
    out[id] = { ...scene, turns: prepareTurns(scene.turns) };
  }
  return out;
}

// Các thể loại sự kiện bổ sung (src/data/events): mỗi thể loại một file
Object.assign(NPCS, EVENT_NPCS);
export const SCENES: Record<string, SceneData> = prepareScenes({ ...rawScenes, ...EVENT_SCENES });

const PREPARED_SCENARIOS: Record<string, Scenario[]> = Object.fromEntries(
  Object.entries(SCENARIOS).map(([id, list]) => [id, list.map((sc) => ({ ...sc, turns: prepareTurns(sc.turns) }))])
);

/** Bộ lượt sinh bằng cách ghép mẫu câu (dailyGen.ts, showGen.ts): cùng tình huống gốc, đổi chi tiết. */
export function generatedTurnsForDay(scene: SceneData, day: number): TurnData[] {
  const gen = DAILY_GENERATORS[scene.id] || SHOW_GENERATORS[scene.id];
  return gen ? prepareTurns(gen(day)) : scene.turns;
}

export interface DayScript {
  /** id của bộ tình huống, hoặc null khi dùng kịch bản gốc hay bộ sinh. */
  scenarioId: string | null;
  /** Tên tình huống (tiếng Việt) để hiện trên màn show. */
  title: string | null;
  turns: TurnData[];
}

/**
 * Chọn kịch bản cho ngày hiện tại.
 * - Ngày 1: kịch bản gốc (nhiệm vụ và sổ tay dựa vào đó).
 * - Từ ngày 2: xoay vòng qua các bộ tình huống của cảnh (src/data/scenarios), cuối mỗi vòng là
 *   một ngày "tình huống gốc" với chi tiết sinh mới. Vòng dài N ngày nên một tình huống
 *   chỉ quay lại sau N ngày (cảnh ít nhất cũng 7 ngày).
 * Bộ tình huống có số lượt khác kịch bản gốc bị bỏ qua, vì nhiệm vụ đánh số theo vị trí lượt.
 */
export function scenarioForDay(scene: SceneData, day: number): DayScript {
  const d = Number.isFinite(day) && day >= 1 ? Math.floor(day) : 1;
  if (d < 2) return { scenarioId: null, title: null, turns: scene.turns };
  const list = (PREPARED_SCENARIOS[scene.id] || []).filter((sc) => sc.turns.length === scene.turns.length);
  const hasGen = Boolean(DAILY_GENERATORS[scene.id] || SHOW_GENERATORS[scene.id]);
  const cycle = list.length + (hasGen ? 1 : 0);
  if (cycle === 0) return { scenarioId: null, title: null, turns: scene.turns };
  const slot = (d - 2) % cycle;
  if (slot < list.length) {
    const sc = list[slot];
    return { scenarioId: sc.id, title: sc.title, turns: sc.turns };
  }
  return { scenarioId: null, title: null, turns: generatedTurnsForDay(scene, d) };
}

/** Lượt thoại của một kịch bản theo khóa ("<cảnh>:base" hoặc id tình huống). Bộ sinh ("<cảnh>:gen") trả null. */
export function scriptTurns(key: string): { scene: SceneData; turns: TurnData[] } | null {
  const [sceneId, kind] = key.split(':');
  if (kind === 'base' && SCENES[sceneId]) return { scene: SCENES[sceneId], turns: SCENES[sceneId].turns };
  for (const [id, list] of Object.entries(PREPARED_SCENARIOS)) {
    const sc = list.find((x) => x.id === key);
    if (sc && SCENES[id]) return { scene: SCENES[id], turns: sc.turns };
  }
  return null;
}

export function turnsForDay(scene: SceneData, day: number): TurnData[] {
  return scenarioForDay(scene, day).turns;
}

const STREET_TALK_BASE: StreetTalkItem[] = [
  {
    id: 'st-dir-1',
    level: 'A2',
    loc: null,
    when: ['morning', 'afternoon', 'evening', 'night'],
    prompt: {
      en: 'Excuse me, do you know where the coffee shop is?',
      vi: 'Xin lỗi, bạn có biết quán cà phê ở đâu không?',
    },
    options: [
      {
        en: 'Sure! It\'s just around the corner, next to the supermarket.',
        vi: 'Có chứ! Ngay góc phố thôi, cạnh siêu thị.',
        ok: true,
      },
      {
        en: 'Yes, I know it.',
        vi: 'Có, tôi biết.',
        ok: false,
        why: 'Chỉ đáp “có biết” mà không chỉ đường — người hỏi vẫn chưa biết đi lối nào.',
      },
      {
        en: 'It\'s in the corner, next the supermarket.',
        vi: 'Nó ở trong góc, cạnh siêu thị.',
        ok: false,
        why: 'Thiếu “to” (next to). Và “around the corner” là ngay góc phố, còn “in the corner” là trong góc phòng.',
      },
    ],
  },
  {
    id: 'st-dir-2',
    level: 'B1',
    loc: null,
    when: ['morning', 'afternoon', 'evening', 'night'],
    prompt: {
      en: 'I think I\'m lost. How do I get to the TV station from here?',
      vi: 'Hình như tôi lạc rồi. Từ đây đến đài truyền hình đi thế nào?',
    },
    options: [
      {
        en: 'Go straight two block, then turn left side.',
        vi: 'Đi thẳng hai dãy nhà, rồi rẽ bên trái.',
        ok: false,
        why: 'Số nhiều phải là “two blocks”; “turn left” là đủ, không thêm “side”.',
      },
      {
        en: 'Go straight for two blocks, then turn left. You can\'t miss it.',
        vi: 'Đi thẳng hai dãy nhà rồi rẽ trái. Bạn sẽ thấy ngay thôi.',
        ok: true,
      },
      {
        en: 'Very far. Take taxi.',
        vi: 'Xa lắm. Đi taxi đi.',
        ok: false,
        why: 'Cộc lốc và thiếu “a” (take a taxi). Nếu xa, hãy nói nhẹ nhàng: “It\'s a bit far — a taxi might be easier.”',
      },
    ],
  },
  {
    id: 'st-weather-1',
    level: 'A2',
    loc: null,
    when: ['morning', 'afternoon'],
    prompt: {
      en: 'It\'s so hot today, isn\'t it?',
      vi: 'Hôm nay nóng quá nhỉ?',
    },
    options: [
      {
        en: 'Yes, today is hot weather.',
        vi: 'Vâng, hôm nay là thời tiết nóng.',
        ok: false,
        why: 'Dịch từng chữ kiểu tiếng Việt. Người bản xứ nói “It\'s really hot today” hoặc “It really is!”.',
      },
      {
        en: 'No.',
        vi: 'Không.',
        ok: false,
        why: 'Quá cụt — small talk cần đáp lại thêm một câu cho cuộc trò chuyện tiếp tục.',
      },
      {
        en: 'It really is! I\'m trying to stay in the shade.',
        vi: 'Đúng thật! Mình đang cố đứng trong bóng râm đây.',
        ok: true,
      },
    ],
  },
  {
    id: 'st-outfit-1',
    level: 'A2',
    loc: null,
    when: ['morning', 'afternoon', 'evening', 'night'],
    prompt: {
      en: 'I love your jacket! Where did you get it?',
      vi: 'Áo khoác của bạn đẹp quá! Bạn mua ở đâu vậy?',
    },
    options: [
      {
        en: 'Thank you! I got it at a little shop near the market.',
        vi: 'Cảm ơn nhé! Mình mua ở một tiệm nhỏ gần chợ.',
        ok: true,
      },
      {
        en: 'Thank you! I buy it at a shop last week.',
        vi: 'Cảm ơn! Tuần trước mình mua ở một cửa hàng.',
        ok: false,
        why: 'Sai thì — có “last week” phải dùng quá khứ: “I bought it”.',
      },
      {
        en: 'Oh no, it\'s very cheap and old.',
        vi: 'Ôi không, nó rẻ và cũ lắm.',
        ok: false,
        why: 'Chê lại đồ của mình để khiêm tốn là thói quen của người Việt; người bản xứ chỉ cần bạn nói “Thank you!”.',
      },
    ],
  },
  {
    id: 'st-voice-1',
    level: 'B1',
    loc: null,
    when: ['morning', 'afternoon', 'evening', 'night'],
    prompt: {
      en: 'You have such a clear voice. Are you a singer?',
      vi: 'Giọng bạn trong quá. Bạn là ca sĩ à?',
    },
    options: [
      {
        en: 'No, I am work as MC.',
        vi: 'Không, tôi làm MC.',
        ok: false,
        why: 'Không dùng “am” cùng động từ thường; nói “I work as an MC” (MC đọc /em-si/ nên dùng “an”).',
      },
      {
        en: 'No. Singer is different.',
        vi: 'Không. Ca sĩ khác.',
        ok: false,
        why: 'Cộc và khó hiểu. Hãy cảm ơn lời khen rồi giới thiệu nghề của mình.',
      },
      {
        en: 'Thank you! I\'m actually an event MC — I host weddings and galas.',
        vi: 'Cảm ơn bạn! Thật ra mình là MC sự kiện — mình dẫn tiệc cưới và gala.',
        ok: true,
      },
    ],
  },
  {
    id: 'st-fan-1',
    level: 'B1',
    loc: null,
    when: ['morning', 'afternoon', 'evening', 'night'],
    prompt: {
      en: 'Wait, aren\'t you the MC from that wedding video online?',
      vi: 'Khoan, bạn có phải MC trong clip đám cưới trên mạng không?',
    },
    options: [
      {
        en: 'Yes, I am MC of that video.',
        vi: 'Vâng, tôi là MC của video đó.',
        ok: false,
        why: 'Thiếu mạo từ (“the MC”) và nghe cứng. Tự nhiên nhất là: “Yes, that\'s me!”.',
      },
      {
        en: 'Yes, that\'s me! Thanks so much for watching.',
        vi: 'Đúng là mình đây! Cảm ơn bạn đã xem nhé.',
        ok: true,
      },
      {
        en: 'Yes. What do you want?',
        vi: 'Ừ. Bạn muốn gì?',
        ok: false,
        why: 'Nghe như khó chịu với fan — MC luôn giữ hình ảnh thân thiện ngoài đời.',
      },
    ],
  },
  {
    id: 'st-fan-2',
    level: 'B1',
    loc: null,
    when: ['morning', 'afternoon', 'evening', 'night'],
    prompt: {
      en: 'I\'m a big fan! Could I take a quick selfie with you?',
      vi: 'Mình hâm mộ bạn lắm! Cho mình chụp nhanh tấm selfie nhé?',
    },
    options: [
      {
        en: 'Sure, you can take a selfie for me.',
        vi: 'Được, bạn chụp selfie giúp tôi.',
        ok: false,
        why: '“for me” là chụp hộ tôi; chụp chung phải là “with me”.',
      },
      {
        en: 'Okay, quickly quickly.',
        vi: 'Ừ, nhanh nhanh.',
        ok: false,
        why: 'Lặp từ kiểu tiếng Việt “nhanh nhanh” — nghe như đang hối, thiếu lịch sự với fan.',
      },
      {
        en: 'Of course! Let\'s find some good light over here.',
        vi: 'Tất nhiên rồi! Qua đây chỗ có ánh sáng đẹp nhé.',
        ok: true,
      },
    ],
  },
  {
    id: 'st-book-1',
    level: 'B2',
    loc: null,
    when: ['morning', 'afternoon', 'evening', 'night'],
    prompt: {
      en: 'We\'re getting married in December. Do you host bilingual weddings?',
      vi: 'Tụi mình sẽ cưới vào tháng Mười Hai. Bạn có dẫn tiệc cưới song ngữ không?',
    },
    options: [
      {
        en: 'I do — congratulations! I\'d love to hear more about your plans.',
        vi: 'Có chứ — chúc mừng hai bạn! Mình rất muốn nghe thêm về kế hoạch của hai bạn.',
        ok: true,
      },
      {
        en: 'Yes, I can host English and Vietnamese both.',
        vi: 'Có, tôi dẫn được tiếng Anh và tiếng Việt cả hai.',
        ok: false,
        why: 'Sai trật tự: “both English and Vietnamese”. Và đừng quên chúc mừng cặp đôi trước.',
      },
      {
        en: 'Yes. How much is your budget?',
        vi: 'Có. Ngân sách của bạn bao nhiêu?',
        ok: false,
        why: 'Hỏi tiền ngay câu đầu quá đường đột. Hãy chúc mừng và hỏi về kế hoạch cưới trước.',
      },
    ],
  },
  {
    id: 'st-book-2',
    level: 'B2',
    loc: null,
    when: ['afternoon', 'evening'],
    prompt: {
      en: 'What\'s your rate for a three-hour evening reception?',
      vi: 'Giá của bạn cho một tiệc tối kéo dài ba tiếng là bao nhiêu?',
    },
    options: [
      {
        en: 'It\'s depend on the program.',
        vi: 'Nó tuỳ vào chương trình.',
        ok: false,
        why: '“depend” là động từ, không đi với “is”: nói “It depends on the program”.',
      },
      {
        en: 'Cheap, cheap! Don\'t worry about it.',
        vi: 'Rẻ mà, rẻ mà! Đừng lo.',
        ok: false,
        why: 'Quá suồng sã — khách cần một báo giá rõ ràng, chuyên nghiệp.',
      },
      {
        en: 'It depends on the program. Could I send you a detailed quote?',
        vi: 'Còn tuỳ vào chương trình. Mình gửi bạn bảng báo giá chi tiết nhé?',
        ok: true,
      },
    ],
  },
  {
    id: 'st-thanks-1',
    level: 'A2',
    loc: null,
    when: ['morning', 'afternoon', 'evening', 'night'],
    prompt: {
      en: 'Thank you so much for your help!',
      vi: 'Cảm ơn bạn đã giúp nhiều nhé!',
    },
    options: [
      {
        en: 'Nothing.',
        vi: 'Không có gì.',
        ok: false,
        why: 'Dịch từng chữ “Không có gì”. Tiếng Anh nói “You\'re welcome!” hoặc “No problem!”.',
      },
      {
        en: 'You\'re welcome! Have a great day.',
        vi: 'Không có gì đâu! Chúc bạn một ngày vui nhé.',
        ok: true,
      },
      {
        en: 'Yes.',
        vi: 'Ừ.',
        ok: false,
        why: 'Đáp “Yes” khi được cảm ơn nghe như đồng ý là mình giúp nhiều — hơi kiêu và cộc.',
      },
    ],
  },
  {
    id: 'st-home-1',
    level: 'A2',
    loc: 'home',
    when: ['morning'],
    prompt: {
      en: 'Good morning! Off to work already?',
      vi: 'Chào buổi sáng! Đi làm sớm thế à?',
    },
    options: [
      {
        en: 'Morning! Yes, I have a rehearsal at the theater today.',
        vi: 'Chào buổi sáng! Vâng, hôm nay mình có buổi tổng duyệt ở nhà hát.',
        ok: true,
      },
      {
        en: 'Yes, I\'m going to work at now.',
        vi: 'Vâng, tôi đang đi làm bây giờ.',
        ok: false,
        why: '“now” không đi với “at”: nói “I\'m heading to work now”.',
      },
      {
        en: 'Good morning! Have you eaten yet?',
        vi: 'Chào buổi sáng! Ăn sáng chưa?',
        ok: false,
        why: '“Ăn cơm chưa?” là lời chào kiểu Việt; với người nước ngoài nó nghe như câu hỏi riêng tư, không phải lời chào.',
      },
    ],
  },
  {
    id: 'st-home-2',
    level: 'B1',
    loc: 'home',
    when: ['morning', 'afternoon', 'evening'],
    prompt: {
      en: 'I heard you practicing your speech last night. It sounded great!',
      vi: 'Tối qua tôi nghe bạn tập nói. Nghe hay lắm!',
    },
    options: [
      {
        en: 'Thank you! I was practice until midnight.',
        vi: 'Cảm ơn! Tôi tập tới nửa đêm.',
        ok: false,
        why: 'Sai thì: “I was practicing” hoặc “I practiced until midnight”.',
      },
      {
        en: 'Yes, I know. I\'m very good.',
        vi: 'Vâng, tôi biết. Tôi giỏi lắm.',
        ok: false,
        why: 'Tự khen thẳng thừng nghe kiêu — chỉ cần cảm ơn và hỏi thăm hàng xóm.',
      },
      {
        en: 'Oh, thank you! Sorry if I was a bit too loud.',
        vi: 'Ôi, cảm ơn nhé! Xin lỗi nếu mình hơi ồn.',
        ok: true,
      },
    ],
  },
  {
    id: 'st-home-3',
    level: 'A2',
    loc: 'home',
    when: ['afternoon', 'evening'],
    prompt: {
      en: 'Your package arrived this afternoon, so I kept it for you.',
      vi: 'Chiều nay có bưu kiện của bạn, tôi giữ giúp rồi đấy.',
    },
    options: [
      {
        en: 'Thank you for keep it.',
        vi: 'Cảm ơn vì giữ nó.',
        ok: false,
        why: 'Sau “for” động từ phải thêm -ing: “Thank you for keeping it”.',
      },
      {
        en: 'That\'s so kind of you! Thank you for keeping it.',
        vi: 'Bạn tốt quá! Cảm ơn đã giữ giúp mình.',
        ok: true,
      },
      {
        en: 'Okay. Give me.',
        vi: 'Ừ. Đưa đây.',
        ok: false,
        why: 'Cộc lốc — thiếu “please” và lời cảm ơn hàng xóm.',
      },
    ],
  },
  {
    id: 'st-cafe-1',
    level: 'A2',
    loc: 'cafe',
    when: ['morning', 'afternoon'],
    prompt: {
      en: 'Hi there! Is this for here or to go?',
      vi: 'Chào bạn! Uống tại chỗ hay mang đi ạ?',
    },
    options: [
      {
        en: 'Yes, please.',
        vi: 'Vâng, làm ơn.',
        ok: false,
        why: 'Câu hỏi lựa chọn (A hay B) không trả lời bằng Yes/No — hãy chọn một: “To go” hoặc “For here”.',
      },
      {
        en: 'To go, please. I\'m in a bit of a hurry.',
        vi: 'Mang đi nhé. Mình đang hơi vội.',
        ok: true,
      },
      {
        en: 'I bring it go home.',
        vi: 'Tôi mang nó đi về nhà.',
        ok: false,
        why: 'Dịch từng chữ “mang về”. Tiếng Anh chỉ cần “To go, please” hoặc “Takeaway, please”.',
      },
    ],
  },
  {
    id: 'st-cafe-2',
    level: 'B1',
    loc: 'cafe',
    when: ['morning'],
    prompt: {
      en: 'Is anyone sitting here? The café is packed this morning.',
      vi: 'Chỗ này có ai ngồi chưa? Sáng nay quán đông quá.',
    },
    options: [
      {
        en: 'Yes, you can sit.',
        vi: 'Có, bạn ngồi được.',
        ok: false,
        why: 'Đáp “Yes” cho “Is anyone sitting here?” nghĩa là ĐÃ có người ngồi. Muốn mời ngồi phải nói “No, go ahead!”.',
      },
      {
        en: 'No have people. Sit, sit.',
        vi: 'Không có người. Ngồi đi, ngồi đi.',
        ok: false,
        why: 'Dịch từng chữ “không có người”. Nói “No, it\'s free — go ahead!”.',
      },
      {
        en: 'No, go ahead! I\'m leaving in a few minutes anyway.',
        vi: 'Chưa có ai, bạn cứ ngồi! Vài phút nữa mình cũng đi rồi.',
        ok: true,
      },
    ],
  },
  {
    id: 'st-cafe-3',
    level: 'B2',
    loc: 'cafe',
    when: ['evening', 'night'],
    prompt: {
      en: 'We\'re starting an open-mic night. Would you consider being our host?',
      vi: 'Quán sắp mở đêm nhạc open-mic. Bạn có muốn làm MC cho tụi mình không?',
    },
    options: [
      {
        en: 'I\'d be happy to! Could you send me the date and details?',
        vi: 'Rất sẵn lòng! Bạn gửi mình ngày giờ và thông tin chi tiết nhé?',
        ok: true,
      },
      {
        en: 'I\'m considering about it.',
        vi: 'Tôi đang cân nhắc về nó.',
        ok: false,
        why: '“consider” không đi với “about”: nói “I\'ll consider it” hoặc “Let me think about it”.',
      },
      {
        en: 'Maybe. If you pay me a lot.',
        vi: 'Có thể. Nếu trả tôi nhiều tiền.',
        ok: false,
        why: 'Quá thẳng và trần trụi — chuyện cát-xê nên bàn sau, lịch sự hơn.',
      },
    ],
  },
  {
    id: 'st-market-1',
    level: 'A2',
    loc: 'market',
    when: ['morning', 'afternoon', 'evening'],
    prompt: {
      en: 'Excuse me, do they sell fresh herbs here?',
      vi: 'Xin lỗi, ở đây có bán rau thơm tươi không?',
    },
    options: [
      {
        en: 'Yes, they are sell near the entrance.',
        vi: 'Có, chúng được bán gần lối vào.',
        ok: false,
        why: 'Bị động phải là “they\'re sold”, hoặc nói chủ động “they sell them near the entrance”.',
      },
      {
        en: 'Yes! They\'re in the produce section, near the entrance.',
        vi: 'Có! Ở quầy rau củ, gần lối vào đó.',
        ok: true,
      },
      {
        en: 'I don\'t know. Ask other people.',
        vi: 'Không biết. Hỏi người khác đi.',
        ok: false,
        why: 'Nghe phũ. Lịch sự hơn: “Sorry, I\'m not sure — maybe ask a staff member?”.',
      },
    ],
  },
  {
    id: 'st-market-2',
    level: 'B1',
    loc: 'market',
    when: ['morning', 'afternoon', 'evening'],
    prompt: {
      en: 'Oh, sorry! Did I just bump into you with my cart?',
      vi: 'Ôi, xin lỗi! Tôi vừa đẩy xe va vào bạn phải không?',
    },
    options: [
      {
        en: 'Yes, you hit me. Be careful.',
        vi: 'Đúng, bạn tông tôi. Cẩn thận đi.',
        ok: false,
        why: 'Quá gay gắt cho một va chạm nhỏ khi người kia đã xin lỗi.',
      },
      {
        en: 'Never mind, it\'s nothing happen.',
        vi: 'Không sao, không có gì xảy ra.',
        ok: false,
        why: 'Sai cấu trúc: “Nothing happened” — hoặc gọn nhất “No worries!”.',
      },
      {
        en: 'No worries at all! It\'s really busy in here today.',
        vi: 'Không sao đâu! Hôm nay ở đây đông thật.',
        ok: true,
      },
    ],
  },
  {
    id: 'st-market-3',
    level: 'B2',
    loc: 'market',
    when: ['morning', 'afternoon', 'evening'],
    prompt: {
      en: 'Sorry, our card machine is down. Do you mind paying in cash?',
      vi: 'Xin lỗi, máy quẹt thẻ đang hỏng. Bạn trả tiền mặt có phiền không?',
    },
    options: [
      {
        en: 'Not at all. Let me check — yes, I\'ve got enough.',
        vi: 'Không phiền gì. Để mình xem — có, mình đủ tiền.',
        ok: true,
      },
      {
        en: 'Yes, of course!',
        vi: 'Có, tất nhiên!',
        ok: false,
        why: '“Do you mind…?” trả lời “Yes” nghĩa là CÓ phiền. Muốn đồng ý phải nói “Not at all” hoặc “No problem”.',
      },
      {
        en: 'Why your machine always broken?',
        vi: 'Sao máy của bạn lúc nào cũng hỏng?',
        ok: false,
        why: 'Sai ngữ pháp (Why is your machine always broken?) và giọng trách móc với nhân viên.',
      },
    ],
  },
  {
    id: 'st-theater-1',
    level: 'B1',
    loc: 'theater',
    when: ['afternoon', 'evening'],
    prompt: {
      en: 'Do you know what time the show starts tonight?',
      vi: 'Bạn có biết tối nay mấy giờ chương trình bắt đầu không?',
    },
    options: [
      {
        en: 'It start at eight o\'clock.',
        vi: 'Nó bắt đầu lúc tám giờ.',
        ok: false,
        why: 'Thiếu -s cho ngôi thứ ba số ít: “It starts at eight”.',
      },
      {
        en: 'I think it starts at eight, but the box office can confirm.',
        vi: 'Mình nghĩ là tám giờ, nhưng quầy vé sẽ xác nhận chính xác.',
        ok: true,
      },
      {
        en: 'I don\'t work here.',
        vi: 'Tôi không làm ở đây.',
        ok: false,
        why: 'Nghe phũ. Nếu không chắc, hãy gợi ý: “Sorry, I\'m not sure — maybe ask the box office?”.',
      },
    ],
  },
  {
    id: 'st-theater-2',
    level: 'B2',
    loc: 'theater',
    when: ['evening', 'night'],
    prompt: {
      en: 'Break a leg tonight! Are you hosting the charity concert?',
      vi: 'Chúc tối nay diễn thật thành công! Bạn dẫn đêm nhạc từ thiện à?',
    },
    options: [
      {
        en: 'Why? Do you want me to fall?',
        vi: 'Sao? Bạn muốn tôi ngã à?',
        ok: false,
        why: '“Break a leg” là thành ngữ chúc may mắn trong giới biểu diễn, không phải trù ẻo.',
      },
      {
        en: 'Thanks! Yes, I host it tonight.',
        vi: 'Cảm ơn! Vâng, tôi dẫn tối nay.',
        ok: false,
        why: 'Kế hoạch đã định sẵn dùng hiện tại tiếp diễn: “I\'m hosting it tonight”.',
      },
      {
        en: 'Thanks! Yes, I am — fingers crossed it all runs smoothly.',
        vi: 'Cảm ơn nhé! Đúng rồi — mong mọi thứ suôn sẻ.',
        ok: true,
      },
    ],
  },
  {
    id: 'st-wedding-1',
    level: 'B1',
    loc: 'wedding',
    when: ['afternoon', 'evening'],
    prompt: {
      en: 'Excuse me, is the wedding reception on this floor?',
      vi: 'Xin lỗi, tiệc cưới tổ chức ở tầng này phải không?',
    },
    options: [
      {
        en: 'It\'s on the second floor. The elevator is just to your right.',
        vi: 'Tiệc ở tầng hai ạ. Thang máy ngay bên phải mình.',
        ok: true,
      },
      {
        en: 'It\'s in the floor two.',
        vi: 'Nó ở trong tầng hai.',
        ok: false,
        why: 'Tầng dùng “on” + số thứ tự: “on the second floor”.',
      },
      {
        en: 'Go up, go up.',
        vi: 'Đi lên, đi lên.',
        ok: false,
        why: 'Quá cụt — khách không biết lên tầng mấy, đi lối nào.',
      },
    ],
  },
  {
    id: 'st-wedding-2',
    level: 'B2',
    loc: 'wedding',
    when: ['evening', 'night'],
    prompt: {
      en: 'Thank you for hosting so beautifully. Everyone loved your toast!',
      vi: 'Cảm ơn bạn đã dẫn quá tuyệt. Ai cũng thích màn nâng ly của bạn!',
    },
    options: [
      {
        en: 'Thank you! I\'m very honor to host.',
        vi: 'Cảm ơn! Tôi rất vinh dự được dẫn.',
        ok: false,
        why: '“honor” là danh từ. Nói “I\'m honored” hoặc “It was an honor”.',
      },
      {
        en: 'That means a lot. It was an honor to be part of their day.',
        vi: 'Lời khen đó ý nghĩa lắm. Được góp mặt trong ngày vui của hai bạn là vinh dự của mình.',
        ok: true,
      },
      {
        en: 'Yes, I know. I always do it well.',
        vi: 'Vâng, tôi biết. Tôi lúc nào cũng làm tốt.',
        ok: false,
        why: 'Nghe kiêu — MC cưới khéo léo luôn hướng lời khen về cặp đôi.',
      },
    ],
  },
  {
    id: 'st-hotel-1',
    level: 'A2',
    loc: 'hotel',
    when: ['evening', 'night'],
    prompt: {
      en: 'Good evening! Are you here for the gala dinner?',
      vi: 'Chào buổi tối! Bạn đến dự tiệc gala phải không?',
    },
    options: [
      {
        en: 'Yes, I come for the gala.',
        vi: 'Vâng, tôi đến cho gala.',
        ok: false,
        why: 'Sai thì. Đáp theo đúng cấu trúc câu hỏi: “Yes, I\'m here for the gala”.',
      },
      {
        en: 'Yes. Backstage where?',
        vi: 'Ừ. Hậu trường đâu?',
        ok: false,
        why: 'Cộc lốc, sai trật tự. Lịch sự: “Could you tell me where the backstage entrance is?”.',
      },
      {
        en: 'Yes, I\'m the MC tonight. Where\'s the backstage entrance, please?',
        vi: 'Vâng, tối nay mình là MC. Cho mình hỏi lối vào hậu trường ở đâu ạ?',
        ok: true,
      },
    ],
  },
  {
    id: 'st-hotel-2',
    level: 'B2',
    loc: 'hotel',
    when: ['evening', 'night'],
    prompt: {
      en: 'Could you recommend a good place for local food nearby?',
      vi: 'Bạn có thể gợi ý chỗ nào gần đây ăn món địa phương ngon không?',
    },
    options: [
      {
        en: 'Definitely! Try the pho place across the street — it\'s a local favorite.',
        vi: 'Chắc chắn rồi! Thử quán phở bên kia đường nhé — dân địa phương mê lắm.',
        ok: true,
      },
      {
        en: 'You should to try pho across the street.',
        vi: 'Bạn nên thử phở bên kia đường.',
        ok: false,
        why: 'Sau “should” dùng động từ nguyên mẫu, không có “to”: “You should try…”.',
      },
      {
        en: 'Many places. You go find.',
        vi: 'Nhiều chỗ lắm. Bạn tự đi tìm.',
        ok: false,
        why: 'Cộc lốc và dịch từng chữ — khách nước ngoài cần một gợi ý cụ thể.',
      },
    ],
  },
  {
    id: 'st-hotel-3',
    level: 'B2',
    loc: 'hotel',
    when: ['evening', 'night'],
    prompt: {
      en: 'The CEO\'s speech might run long. Can you be flexible with the timing?',
      vi: 'Bài phát biểu của CEO có thể kéo dài. Bạn linh động thời gian được không?',
    },
    options: [
      {
        en: 'No problem, I will cut his speech.',
        vi: 'Không sao, tôi sẽ cắt bài phát biểu của ông ấy.',
        ok: false,
        why: 'MC không bao giờ tự cắt lời CEO — hãy hứa linh động và chờ tín hiệu từ ban tổ chức.',
      },
      {
        en: 'Absolutely. Just give me a signal, and I\'ll adjust the program.',
        vi: 'Hoàn toàn được. Chỉ cần ra hiệu, mình sẽ điều chỉnh chương trình.',
        ok: true,
      },
      {
        en: 'Okay, I am flexible with everything time.',
        vi: 'Được, tôi linh động với mọi thời gian.',
        ok: false,
        why: '“everything time” sai; nói “I can be flexible with the timing”.',
      },
    ],
  },
  {
    id: 'st-beach-1',
    level: 'A2',
    loc: 'beach',
    when: ['afternoon', 'evening'],
    prompt: {
      en: 'Excuse me, could you take a photo of us?',
      vi: 'Xin lỗi, bạn chụp giúp tụi mình một tấm được không?',
    },
    options: [
      {
        en: 'Sure, I take photo for you.',
        vi: 'Được, tôi chụp ảnh cho bạn.',
        ok: false,
        why: 'Thiếu “will” và “a”: “Sure, I\'ll take a photo for you”.',
      },
      {
        en: 'Sure! Say cheese! I\'ll take one more, just in case.',
        vi: 'Được chứ! Cười lên nào! Mình chụp thêm một tấm cho chắc nhé.',
        ok: true,
      },
      {
        en: 'No, I\'m busy.',
        vi: 'Không, tôi bận.',
        ok: false,
        why: 'Quá cộc. Nếu bận thật: “Sorry, I\'m in a bit of a rush.”',
      },
    ],
  },
  {
    id: 'st-beach-2',
    level: 'B1',
    loc: 'beach',
    when: ['morning', 'afternoon'],
    prompt: {
      en: 'Is the water safe for swimming here?',
      vi: 'Ở đây nước có an toàn để bơi không?',
    },
    options: [
      {
        en: 'Yes, you can swimming.',
        vi: 'Có, bạn có thể bơi.',
        ok: false,
        why: 'Sau “can” dùng động từ nguyên mẫu: “you can swim”.',
      },
      {
        en: 'I think so. Good luck!',
        vi: 'Chắc vậy. Chúc may mắn!',
        ok: false,
        why: 'Nghe thiếu trách nhiệm với chuyện an toàn — hãy chỉ chỗ có cứu hộ.',
      },
      {
        en: 'Usually, yes, but stay between the flags where the lifeguards are.',
        vi: 'Thường là an toàn, nhưng hãy bơi giữa hai lá cờ, chỗ có cứu hộ.',
        ok: true,
      },
    ],
  },
  {
    id: 'st-beach-3',
    level: 'B2',
    loc: 'beach',
    when: ['afternoon', 'evening'],
    prompt: {
      en: 'Is the sunset ceremony still on? The wind is really picking up.',
      vi: 'Lễ cưới lúc hoàng hôn vẫn diễn ra chứ? Gió đang mạnh dần lên.',
    },
    options: [
      {
        en: 'Yes, it\'s still on — everything is secured, so please take a seat.',
        vi: 'Vẫn diễn ra ạ — mọi thứ đã được cố định chắc chắn, mời anh chị vào chỗ.',
        ok: true,
      },
      {
        en: 'Yes, it is still open.',
        vi: 'Vâng, nó vẫn mở.',
        ok: false,
        why: '“still on” = vẫn diễn ra; “open” chỉ dùng cho cửa hàng, quán xá.',
      },
      {
        en: 'I don\'t know, maybe cancel.',
        vi: 'Không biết, chắc huỷ.',
        ok: false,
        why: 'Người dẫn chương trình không được làm khách hoang mang — hãy trấn an và mời vào chỗ.',
      },
    ],
  },
  {
    id: 'st-tv-1',
    level: 'B1',
    loc: 'tv',
    when: ['morning', 'afternoon', 'evening'],
    prompt: {
      en: 'Hi, which program are you here for today?',
      vi: 'Chào bạn, hôm nay bạn đến tham gia chương trình nào?',
    },
    options: [
      {
        en: 'I\'m here for talk show at evening.',
        vi: 'Tôi đến cho talk show vào buổi tối.',
        ok: false,
        why: 'Thiếu “the” và sai giới từ: “the talk show in the evening”.',
      },
      {
        en: 'I\'m a guest on the evening talk show. Here\'s my invitation.',
        vi: 'Mình là khách mời talk show tối nay. Thư mời của mình đây.',
        ok: true,
      },
      {
        en: 'You don\'t know me?',
        vi: 'Bạn không biết tôi à?',
        ok: false,
        why: 'Nghe kiêu — nhân viên an ninh chỉ đang làm đúng việc của họ.',
      },
    ],
  },
  {
    id: 'st-tv-2',
    level: 'B2',
    loc: 'tv',
    when: ['afternoon', 'evening'],
    prompt: {
      en: 'Quick question for our viewers: what makes a great wedding MC?',
      vi: 'Hỏi nhanh cho khán giả nhà đài: thế nào là một MC đám cưới giỏi?',
    },
    options: [
      {
        en: 'I think is good voice and beautiful face.',
        vi: 'Tôi nghĩ là giọng hay và mặt đẹp.',
        ok: false,
        why: 'Thiếu chủ ngữ “it” (I think it\'s…), và câu trả lời hời hợt trước ống kính.',
      },
      {
        en: 'Sorry, no comment.',
        vi: 'Xin lỗi, miễn bình luận.',
        ok: false,
        why: 'Đây là câu hỏi tích cực — từ chối nghe như đang né tránh phóng viên.',
      },
      {
        en: 'Listening closely to the couple, and keeping the energy warm but elegant.',
        vi: 'Lắng nghe cặp đôi thật kỹ, và giữ không khí ấm áp mà vẫn sang trọng.',
        ok: true,
      },
    ],
  },
  {
    id: 'st-tv-3',
    level: 'B2',
    loc: 'tv',
    when: ['evening', 'night'],
    prompt: {
      en: 'We\'re live in two minutes. Are you comfortable with the questions?',
      vi: 'Hai phút nữa lên sóng trực tiếp. Bạn thấy ổn với bộ câu hỏi chứ?',
    },
    options: [
      {
        en: 'Yes, I\'ve gone through them. I\'m ready whenever you are.',
        vi: 'Ổn rồi, mình đã xem kỹ hết. Bên bạn sẵn sàng là mình sẵn sàng.',
        ok: true,
      },
      {
        en: 'Yes, I have read them yesterday.',
        vi: 'Vâng, hôm qua tôi đã đọc rồi.',
        ok: false,
        why: 'Hiện tại hoàn thành không đi với “yesterday”: nói “I read them yesterday”.',
      },
      {
        en: 'Relax, relax, everything is easy.',
        vi: 'Thư giãn đi, dễ mà.',
        ok: false,
        why: 'Nghe xuề xoà, xem nhẹ chương trình trực tiếp — nhà sản xuất cần câu trả lời rõ ràng.',
      },
    ],
  },
];

// Toàn bộ kho câu hỏi đường phố: 32 câu gốc + 1000 câu mở rộng (nghe/nói).
export const STREET_TALK: StreetTalkItem[] = [
  ...STREET_TALK_BASE,
  ...STREET_TALK_EXTRA,
  ...STREET_TALK_EXTRA_2,
  ...STREET_TALK_EXTRA_3,
  ...STREET_TALK_EXTRA_4,
  ...STREET_TALK_EXTRA_5,
  ...STREET_TALK_EXTRA_6,
  ...STREET_TALK_EXTRA_7,
  ...STREET_TALK_EXTRA_8,
  ...STREET_TALK_EXTRA_9,
  ...STREET_TALK_EXTRA_10,
];
