"""Meal logging and nutrition estimates.

Pipeline: spoken description -> food list -> per-food nutrients -> totals.
Food lookup order: USDA FoodData Central API (free key) -> local table.
Only the food NAME is ever sent to the API - descriptions and totals stay local.
"""

from __future__ import annotations

import re
import logging
from datetime import datetime, timedelta

import requests

logger = logging.getLogger(__name__)

# Per typical serving: calories, protein g, fiber g. Rough by design -
# ReachyCare gives friendly guidance, not medical numbers.
LOCAL_NUTRITION: dict[str, dict] = {
    "egg": {"calories": 78, "protein_g": 6, "fiber_g": 0},
    "eggs": {"calories": 155, "protein_g": 13, "fiber_g": 0},
    "toast": {"calories": 75, "protein_g": 3, "fiber_g": 1},
    "bread": {"calories": 75, "protein_g": 3, "fiber_g": 1},
    "butter": {"calories": 102, "protein_g": 0, "fiber_g": 0},
    "oatmeal": {"calories": 150, "protein_g": 5, "fiber_g": 4},
    "porridge": {"calories": 150, "protein_g": 5, "fiber_g": 4},
    "banana": {"calories": 105, "protein_g": 1, "fiber_g": 3},
    "apple": {"calories": 95, "protein_g": 0, "fiber_g": 4},
    "orange": {"calories": 62, "protein_g": 1, "fiber_g": 3},
    "yogurt": {"calories": 100, "protein_g": 6, "fiber_g": 0},
    "milk": {"calories": 103, "protein_g": 8, "fiber_g": 0},
    "cheese": {"calories": 113, "protein_g": 7, "fiber_g": 0},
    "chicken": {"calories": 230, "protein_g": 27, "fiber_g": 0},
    "fish": {"calories": 180, "protein_g": 25, "fiber_g": 0},
    "salmon": {"calories": 208, "protein_g": 22, "fiber_g": 0},
    "beef": {"calories": 250, "protein_g": 26, "fiber_g": 0},
    "pork": {"calories": 242, "protein_g": 27, "fiber_g": 0},
    "ham": {"calories": 145, "protein_g": 14, "fiber_g": 0},
    "turkey": {"calories": 165, "protein_g": 24, "fiber_g": 0},
    "rice": {"calories": 205, "protein_g": 4, "fiber_g": 1},
    "pasta": {"calories": 220, "protein_g": 8, "fiber_g": 3},
    "potato": {"calories": 160, "protein_g": 4, "fiber_g": 4},
    "potatoes": {"calories": 160, "protein_g": 4, "fiber_g": 4},
    "soup": {"calories": 120, "protein_g": 6, "fiber_g": 2},
    "salad": {"calories": 50, "protein_g": 2, "fiber_g": 2},
    "beans": {"calories": 220, "protein_g": 15, "fiber_g": 11},
    "lentils": {"calories": 230, "protein_g": 18, "fiber_g": 16},
    "peas": {"calories": 62, "protein_g": 4, "fiber_g": 4},
    "carrots": {"calories": 50, "protein_g": 1, "fiber_g": 3},
    "broccoli": {"calories": 55, "protein_g": 4, "fiber_g": 5},
    "spinach": {"calories": 23, "protein_g": 3, "fiber_g": 2},
    "tomato": {"calories": 22, "protein_g": 1, "fiber_g": 1},
    "sandwich": {"calories": 300, "protein_g": 15, "fiber_g": 3},
    "cereal": {"calories": 150, "protein_g": 3, "fiber_g": 3},
    "cookie": {"calories": 78, "protein_g": 1, "fiber_g": 0},
    "cake": {"calories": 235, "protein_g": 3, "fiber_g": 0},
    "ice cream": {"calories": 137, "protein_g": 2, "fiber_g": 0},
    "tea": {"calories": 2, "protein_g": 0, "fiber_g": 0},
    "coffee": {"calories": 5, "protein_g": 0, "fiber_g": 0},
    "juice": {"calories": 110, "protein_g": 1, "fiber_g": 0},
}

# gentle daily reference values for an older adult (guidance, not medicine)
TARGETS = {"calories": 1800, "protein_g": 65, "fiber_g": 25}

FOOD_PARSE_PROMPT = (
    "Extract the individual foods from this meal description as a short "
    "comma-separated list of simple food names (e.g. 'eggs, toast, orange juice'). "
    "Reply with the list only, no other words."
)


def parse_foods(description: str, llm=None) -> list[str]:
    """Meal description -> list of food names. LLM when available, else keywords."""
    if llm is not None and getattr(llm, "available", False):
        reply = llm.ask(FOOD_PARSE_PROMPT, description, max_tokens=60)
        if reply:
            foods = [f.strip(" .").lower() for f in reply.split(",") if f.strip()]
            if foods:
                return foods[:8]
    lowered = description.lower()
    found = [name for name in LOCAL_NUTRITION if re.search(rf"\b{re.escape(name)}\b", lowered)]
    # drop singular/plural duplicates like egg/eggs
    return [f for f in found if f + "s" not in found][:8]


class NutritionService:
    FDC_URL = "https://api.nal.usda.gov/fdc/v1/foods/search"

    def __init__(self, settings, db, llm=None):
        self.settings = settings
        self.db = db
        self.llm = llm

    # ---------------- lookup ----------------

    def lookup(self, food: str) -> dict:
        """Nutrients for one food: USDA FDC first, local table as fallback."""
        if self.settings.usda_api_key:
            try:
                response = requests.get(
                    self.FDC_URL,
                    params={"api_key": self.settings.usda_api_key, "query": food,
                            "pageSize": 1, "dataType": "Survey (FNDDS)"},
                    timeout=6,
                )
                foods = response.json().get("foods") or []
                if foods:
                    nutrients = {n.get("nutrientName", ""): n.get("value", 0)
                                 for n in foods[0].get("foodNutrients", [])}
                    return {
                        "calories": round(nutrients.get("Energy", 0)),
                        "protein_g": round(nutrients.get("Protein", 0)),
                        "fiber_g": round(nutrients.get("Fiber, total dietary", 0)),
                    }
            except Exception as e:
                logger.debug("USDA lookup failed for %r: %s", food, e)
        for key in (food, food.rstrip("s"), food + "s"):
            if key in LOCAL_NUTRITION:
                return dict(LOCAL_NUTRITION[key])
        return {"calories": 100, "protein_g": 3, "fiber_g": 1}  # unknown food, modest guess

    # ---------------- logging & summaries ----------------

    def log_meal(self, description: str) -> tuple[dict, list[str]]:
        foods = parse_foods(description, self.llm)
        totals = {"calories": 0, "protein_g": 0, "fiber_g": 0}
        for food in foods:
            for key, value in self.lookup(food).items():
                totals[key] = totals.get(key, 0) + value
        self.db.add_meal(description, {**totals, "foods": foods})
        return totals, foods

    def meal_reply(self, totals: dict, foods: list[str]) -> str:
        if not foods:
            return ("Thanks for telling me! I couldn't pick out the foods, but I've "
                    "written it down. You can describe them one by one if you like.")
        listed = ", ".join(foods)
        return (f"Lovely - I noted {listed}. That's roughly {totals['calories']} calories, "
                f"{totals['protein_g']} grams of protein and {totals['fiber_g']} grams of fiber. "
                + self._gap_tip())

    def today_totals(self) -> dict:
        start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        totals = {"calories": 0, "protein_g": 0, "fiber_g": 0}
        for meal in self.db.meals_since(start):
            for key in totals:
                totals[key] += meal["nutrients"].get(key, 0)
        return totals

    def _gap_tip(self) -> str:
        totals = self.today_totals()
        if totals["protein_g"] < TARGETS["protein_g"] * 0.6:
            return "You're a little low on protein today - eggs, fish or lentils would be great tomorrow."
        if totals["fiber_g"] < TARGETS["fiber_g"] * 0.5:
            return "A bit more fiber would do you good - maybe some fruit or oatmeal tomorrow."
        return "You're doing nicely today. Keep it up!"

    def day_summary(self) -> str:
        totals = self.today_totals()
        if totals["calories"] == 0:
            return ("I haven't logged any meals today. Tell me what you ate and "
                    "I'll keep track for you.")
        return (f"So far today: about {totals['calories']} calories, "
                f"{totals['protein_g']} grams of protein and {totals['fiber_g']} grams of fiber. "
                + self._gap_tip())


def weekly_habits(db, nutrition: "NutritionService") -> str:
    """A kind, personal weekly habits list from this senior's own data."""
    adherence = db.adherence_last_days(7)
    week_ago = datetime.now() - timedelta(days=7)
    meals = db.meals_since(week_ago)
    tips: list[str] = []

    total_slots = adherence["confirmed"] + adherence["missed"]
    if total_slots and adherence["missed"] == 0:
        tips.append("you took every single medication on time this week - that's fantastic")
    elif adherence["missed"] > 0:
        tips.append("setting your pills next to the kettle might make the morning dose easier to remember")

    if meals:
        protein = sum(m["nutrients"].get("protein_g", 0) for m in meals) / max(1, len(meals))
        fiber = sum(m["nutrients"].get("fiber_g", 0) for m in meals) / max(1, len(meals))
        if protein < 15:
            tips.append("adding one protein food a day, like eggs, yogurt or lentils, would serve you well")
        if fiber < 5:
            tips.append("a piece of fruit with breakfast would boost your fiber nicely")
        if not tips:
            tips.append("your meals have been lovely and balanced - keep doing what you're doing")
    else:
        tips.append("telling me about your meals in the evening helps me give you better tips")

    tips.append("a short walk or a stretch by the window each day keeps the spirits up")
    tips.append("a glass of water with each meal is an easy win")
    listed = "; ".join(tips[:4])
    return f"Here are this week's gentle ideas: {listed}. Just suggestions - you know yourself best!"
