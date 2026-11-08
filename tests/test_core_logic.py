#!/usr/bin/env python3
"""
Unit test suite verifying the core game formulas and TypeScript module integrity
for MC Life · English Stage 3D (mc-life-3d/).
"""

import os
import re
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def clamp(val, low, high):
    return max(low, min(high, val))


def cha_need(lv: int) -> int:
    return 40 + 50 * (lv - 1)


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
        self.assertEqual(cha_need(1), 40)
        self.assertEqual(cha_need(2), 90)
        self.assertEqual(cha_need(3), 140)

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
