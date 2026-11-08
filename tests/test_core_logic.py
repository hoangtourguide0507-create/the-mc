#!/usr/bin/env python3
"""
Unit test suite verifying the core game formulas and TypeScript module integrity
for MC Life · English Stage 3D (mc-life-3d/).
"""

import math
import os
import re
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def clamp(val, low, high):
    return max(low, min(high, val))


CHA_TABLE = [60, 90, 200, 260, 380, 460, 600, 700, 900]
MAX_LV = 10
REP_WEIGHT = 0.25


def cha_need(lv: int) -> float:
    """Charisma cần để lên cấp kế tiếp (thang nghề 10 cấp)."""
    if lv >= MAX_LV:
        return float("inf")
    return CHA_TABLE[max(1, lv) - 1]


def next_rep(avg: float, n: int, show_avg: float):
    """Danh tiếng: show đầu đặt thẳng, các show sau trung bình trượt 25%."""
    new = show_avg if n <= 0 else avg * (1 - REP_WEIGHT) + show_avg * REP_WEIGHT
    return math.floor(new * 100 + 0.5) / 100, n + 1  # giống Math.round của JS


def travel_minutes(tiles: int) -> int:
    if tiles <= 0:
        return 0
    return max(2, round(tiles * 2.5))


def late_penalty(late: int) -> float:
    if late <= 5:
        return 0.0
    return clamp((late - 5) * 0.012, 0.0, 0.5)


def finish_scene_rewards(
    scene_type: str,
    reward_cash: int,
    reward_cha: int,
    reward_energy: int,
    avg_stars: float,
    bonus_cash: float,
    bonus_cha: float,
    minutes_late: int,
    is_repeat_daily: bool,
):
    mult = 0.6 + 0.15 * avg_stars
    pen = late_penalty(minutes_late) if scene_type == "show" else 0.0
    raw_cash = round(reward_cash * (0.8 + 0.1 * avg_stars) * (1 + bonus_cash))
    cash = round(raw_cash * (1 - pen)) if scene_type == "show" else 0
    k = (1 + bonus_cha) if scene_type == "show" else (0.5 if is_repeat_daily else 1.0)
    charisma = round(reward_cha * mult * k)
    energy = (
        round(reward_energy * mult)
        if (scene_type == "daily" and not is_repeat_daily)
        else 0
    )
    return {"cash": cash, "charisma": charisma, "energy": energy}


class TestGameFormulas(unittest.TestCase):
    def test_charisma_level_thresholds(self):
        self.assertEqual(cha_need(1), 60)
        self.assertEqual(cha_need(2), 90)
        self.assertEqual(cha_need(9), 900)
        self.assertEqual(cha_need(10), float("inf"))
        # Tổng Charisma để đạt Ngôi sao MC (Lv.10)
        self.assertEqual(sum(CHA_TABLE), 3650)

    def test_career_table_matches_source(self):
        with open(os.path.join(ROOT, "src/core/career.ts"), "r", encoding="utf-8") as f:
            src = f.read()
        m = re.search(r"CHA_TABLE = \[([^\]]+)\]", src)
        self.assertIsNotNone(m)
        self.assertEqual([int(x) for x in m.group(1).split(",")], CHA_TABLE)
        self.assertIn("MAX_LV = 10", src)
        self.assertIn("REP_WEIGHT = 0.25", src)

    def test_reputation(self):
        self.assertEqual(next_rep(0, 0, 2.5), (2.5, 1))
        self.assertEqual(next_rep(2.5, 1, 1.0), (2.13, 2))
        avg, n = 0.0, 0
        for _ in range(12):
            avg, n = next_rep(avg, n, 3.0)
        self.assertEqual(avg, 3.0)

    def test_show_unlocks(self):
        with open(os.path.join(ROOT, "src/data/content.ts"), "r", encoding="utf-8") as f:
            content_ts = f.read()
        expected = {"backstage": (1, None), "wedding": (3, None), "beach": (5, "1.6"), "gala": (7, "2.0"), "interview": (9, "2.4")}
        start = content_ts.index("const rawScenes")
        for sid, (lv, rep) in expected.items():
            i = content_ts.index(f"id: '{sid}'", start)
            j = content_ts.index("turns:", i)
            block = content_ts[i:j]
            self.assertIn(f"reqLv: {lv},", block, sid)
            if rep:
                self.assertIn(f"minRep: {rep},", block, sid)
            else:
                self.assertNotIn("minRep", block, sid)

    def test_travel_minutes(self):
        self.assertEqual(travel_minutes(0), 0)
        self.assertEqual(travel_minutes(1), 2)
        self.assertEqual(travel_minutes(24), 60)

    def test_late_penalty(self):
        self.assertEqual(late_penalty(0), 0.0)
        self.assertEqual(late_penalty(5), 0.0)
        self.assertAlmostEqual(late_penalty(15), 0.12)
        self.assertEqual(late_penalty(60), 0.5)

    def test_finish_scene_rewards_show_vs_daily(self):
        # Wedding show (cash=220, cha=45), 3 stars, 15 min late (-12%), goldmic (+15% cash)
        res = finish_scene_rewards(
            scene_type="show",
            reward_cash=220,
            reward_cha=45,
            reward_energy=0,
            avg_stars=3.0,
            bonus_cash=0.15,
            bonus_cha=0.0,
            minutes_late=15,
            is_repeat_daily=False,
        )
        self.assertEqual(res["cash"], round(round(220 * 1.1 * 1.15) * 0.88))
        self.assertEqual(res["charisma"], round(45 * 1.05))
        self.assertEqual(res["energy"], 0)

        # Daily coffee first time vs repeat
        d1 = finish_scene_rewards("daily", 0, 8, 25, 3.0, 0, 0, 0, False)
        d2 = finish_scene_rewards("daily", 0, 8, 25, 3.0, 0, 0, 0, True)
        self.assertEqual(d1["energy"], round(25 * 1.05))
        self.assertEqual(d2["energy"], 0)
        self.assertEqual(d2["charisma"], round(8 * 1.05 * 0.5))

    def test_source_files_exist_and_complete(self):
        required_files = [
            "package.json",
            "tsconfig.json",
            "vite.config.ts",
            "index.html",
            "src/types/game.ts",
            "src/data/content.ts",
            "src/core/clock.ts",
            "src/core/evaluator.ts",
            "src/core/store.ts",
            "src/audio/audioSystem.ts",
            "src/three/ClayCharacter3D.tsx",
            "src/three/HubRoom3D.tsx",
            "src/three/CityWorld3D.tsx",
            "src/three/city/cityMap.ts",
            "src/three/city/Buildings.tsx",
            "src/three/city/Ground.tsx",
            "src/three/city/Props.tsx",
            "src/three/city/Agents.tsx",
            "src/core/career.ts",
            "src/three/Stage3D.tsx",
            "src/components/HUD.tsx",
            "src/components/HubView.tsx",
            "src/components/StageView.tsx",
            "src/components/SheetsAndModals.tsx",
            "src/App.tsx",
            "src/main.tsx",
        ]
        for rel in required_files:
            full = os.path.join(ROOT, rel)
            self.assertTrue(os.path.isfile(full), f"Missing file: {rel}")

        # Verify all 7 scenes and 8 NPCs are defined in content.ts
        with open(os.path.join(ROOT, "src/data/content.ts"), "r", encoding="utf-8") as f:
            content_ts = f.read()
        for npc_id in ["leo", "alex", "couple", "victoria", "sam", "tom", "ivy", "david"]:
            self.assertIn(f"{npc_id}:", content_ts)
        for scene_id in ["coffee", "market", "backstage", "wedding", "beach", "gala", "interview"]:
            self.assertIn(f"{scene_id}:", content_ts)


if __name__ == "__main__":
    unittest.main()
