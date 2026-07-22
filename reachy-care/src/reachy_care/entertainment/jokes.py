"""Senior-friendly jokes: a curated offline bank plus optional LLM-fresh ones.

Every joke here is gentle by design - never mean-spirited, never at anyone's
expense. The LLM prompt repeats that rule for generated jokes.
"""

from __future__ import annotations

import random

JOKE_BANK: list[str] = [
    "Why did the scarecrow win an award? Because he was outstanding in his field!",
    "What do you call a fish wearing a bowtie? So-fish-ticated!",
    "Why don't eggs tell jokes? They'd crack each other up!",
    "What did the ocean say to the beach? Nothing, it just waved!",
    "Why did the gardener plant a light bulb? He wanted a power plant!",
    "What do you call a bear with no teeth? A gummy bear!",
    "Why did the cookie go to the doctor? Because it was feeling crumby!",
    "What's orange and sounds like a parrot? A carrot!",
    "Why do bees have sticky hair? Because they use honeycombs!",
    "What did one wall say to the other wall? I'll meet you at the corner!",
    "Why did the banana go to the doctor? It wasn't peeling well!",
    "What do you call cheese that isn't yours? Nacho cheese!",
    "Why don't scientists trust atoms? Because they make up everything!",
    "What did the grape do when it got stepped on? Nothing, it just let out a little wine!",
    "Why did the golfer bring two pairs of trousers? In case he got a hole in one!",
    "What do you call a sleeping bull? A bulldozer!",
    "Why did the bicycle fall over? It was two-tired!",
    "What kind of music do balloons hate? Pop music!",
    "Why did the tomato blush? Because it saw the salad dressing!",
    "How does the moon cut its hair? Eclipse it!",
    "What do you get when you cross a snowman and a dog? Frostbite... no wait, a pupsicle!",
    "Why was the math book sad? It had too many problems!",
    "What's a skeleton's least favorite room? The living room!",
    "Why did the coffee file a police report? It got mugged!",
    "What do you call an alligator in a vest? An investigator!",
]

JOKE_LLM_PROMPT = (
    "Tell one short, gentle, senior-friendly joke. Family humour only: puns, "
    "wordplay, everyday life. Absolutely never mean-spirited, never about age, "
    "memory, health or any group of people. Reply with the joke only."
)


class JokeTeller:
    def __init__(self, llm=None):
        self.llm = llm
        self._recent: list[str] = []

    def tell(self) -> str:
        """Fresh LLM joke when possible, curated bank otherwise. Never repeats
        itself within the last ten jokes."""
        if self.llm is not None and getattr(self.llm, "available", False) and random.random() < 0.5:
            joke = self.llm.ask(JOKE_LLM_PROMPT, "A joke please!", max_tokens=120)
            if joke:
                return joke
        options = [j for j in JOKE_BANK if j not in self._recent] or JOKE_BANK
        joke = random.choice(options)
        self._recent.append(joke)
        self._recent = self._recent[-10:]
        return joke
