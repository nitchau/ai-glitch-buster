"""Decade-based trivia with adjustable difficulty. Fully offline.

Wrong answers get kindness, right answers get an antenna celebration -
handled by the orchestrator via the returned result.
"""

from __future__ import annotations

import random
import re
from dataclasses import dataclass

# (question, answer, [extra accepted answers]) - difficulty 1 = easy, 2 = harder
TRIVIA_BANK: dict[str, list[tuple[int, str, str, list[str]]]] = {
    "50s and 60s music": [
        (1, "Who was known as the King of Rock and Roll?", "Elvis Presley", ["elvis"]),
        (1, "Which British band sang 'She Loves You' and 'Hey Jude'?", "The Beatles", ["beatles"]),
        (1, "Who sang 'Hound Dog' in 1956?", "Elvis Presley", ["elvis"]),
        (2, "Which singer was called 'The Queen of Soul'?", "Aretha Franklin", ["aretha"]),
        (2, "What was Buddy Holly's backing band called?", "The Crickets", ["crickets"]),
        (2, "Who sang 'What a Wonderful World' in 1967?", "Louis Armstrong", ["armstrong", "satchmo"]),
    ],
    "70s and 80s music": [
        (1, "Which Swedish group sang 'Dancing Queen'?", "ABBA", []),
        (1, "Who was the King of Pop, famous for 'Thriller'?", "Michael Jackson", ["jackson"]),
        (2, "Which band sang 'Bohemian Rhapsody'?", "Queen", []),
        (2, "Who sang 'I Will Survive' in 1978?", "Gloria Gaynor", ["gaynor"]),
        (2, "Which duo sang 'Bridge over Troubled Water'?", "Simon and Garfunkel",
         ["simon & garfunkel", "simon garfunkel"]),
    ],
    "history": [
        (1, "In which year did the first person walk on the moon?", "1969", ["nineteen sixty nine"]),
        (1, "Who was the first president of the United States?", "George Washington", ["washington"]),
        (2, "Which wall came down in Berlin in 1989?", "The Berlin Wall", ["berlin wall"]),
        (2, "Who was the British prime minister for most of World War Two?",
         "Winston Churchill", ["churchill"]),
        (2, "Which ship famously sank on its maiden voyage in 1912?", "The Titanic", ["titanic"]),
    ],
    "movies": [
        (1, "Which movie features Dorothy and the Yellow Brick Road?", "The Wizard of Oz",
         ["wizard of oz"]),
        (1, "Who played the Tramp with the famous bowler hat and cane?", "Charlie Chaplin",
         ["chaplin"]),
        (2, "In which 1942 classic does Humphrey Bogart say 'Here's looking at you, kid'?",
         "Casablanca", []),
        (2, "Which musical film stars Julie Andrews as Maria von Trapp?", "The Sound of Music",
         ["sound of music"]),
        (2, "Who directed the thriller 'Psycho'?", "Alfred Hitchcock", ["hitchcock"]),
    ],
    "general knowledge": [
        (1, "How many days are there in a leap year?", "366", ["three hundred sixty six"]),
        (1, "What is the largest ocean on Earth?", "The Pacific", ["pacific", "pacific ocean"]),
        (1, "Which fruit keeps the doctor away, an apple or an onion?", "An apple", ["apple"]),
        (2, "What is the capital of Australia?", "Canberra", []),
        (2, "How many keys does a standard piano have?", "88", ["eighty eight"]),
        (2, "Which planet is known as the Red Planet?", "Mars", []),
    ],
}

CATEGORIES = list(TRIVIA_BANK)

ENCOURAGEMENTS = [
    "Good try! The answer is {answer}. You'll get the next one!",
    "Ooh, close one! It was {answer}. I love how you keep me on my toes.",
    "Not quite - it was {answer}. That was a tricky one, honestly.",
]
PRAISE = [
    "Yes! {answer} is exactly right! Wonderful!",
    "That's it - {answer}! You really know your stuff!",
    "Correct! {answer}! I'm doing my happy antenna dance!",
]


def normalize_answer(text: str) -> str:
    text = re.sub(r"[^a-z0-9\s]", "", (text or "").lower())
    text = re.sub(r"\b(the|a|an|it was|it is|its|is it|i think|maybe|um|uh)\b", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def check_answer(given: str | None, expected: str, alternates: list[str]) -> bool:
    got = normalize_answer(given or "")
    if not got:
        return False
    accepted = [normalize_answer(expected)] + [normalize_answer(a) for a in alternates]
    return any(a and (a in got or got in a) for a in accepted if a)


@dataclass
class TriviaQuestion:
    category: str
    question: str
    answer: str
    alternates: list[str]
    difficulty: int


class TriviaGame:
    def __init__(self, category: str | None = None, difficulty: int = 1):
        self.category = self._match_category(category)
        self.difficulty = difficulty
        self.score = 0
        self.asked = 0
        self._pool = self._build_pool()

    @staticmethod
    def _match_category(spoken: str | None) -> str:
        if spoken:
            lowered = spoken.lower()
            for cat in CATEGORIES:
                if any(word in lowered for word in cat.split() if len(word) > 2):
                    return cat
        return random.choice(CATEGORIES)

    def _build_pool(self) -> list[TriviaQuestion]:
        pool = [TriviaQuestion(self.category, q, a, alts, d)
                for d, q, a, alts in TRIVIA_BANK[self.category]
                if d <= self.difficulty + 1]
        easy_first = sorted(pool, key=lambda q: q.difficulty + random.random() * 0.5)
        return easy_first

    def next_question(self) -> TriviaQuestion | None:
        if not self._pool:
            return None
        self.asked += 1
        return self._pool.pop(0)

    def grade(self, question: TriviaQuestion, answer: str | None) -> tuple[bool, str]:
        """Return (correct, spoken feedback). Feedback is always kind."""
        if check_answer(answer, question.answer, question.alternates):
            self.score += 1
            return True, random.choice(PRAISE).format(answer=question.answer)
        return False, random.choice(ENCOURAGEMENTS).format(answer=question.answer)

    def final_line(self) -> str:
        return (f"That's {self.score} out of {self.asked} on {self.category}. "
                "Thanks for playing with me - that was fun!")
