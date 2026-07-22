"""LLM-driven guessing games: 20 Questions and Akinator mode.

Both games return one line at a time so the orchestrator can interleave
speech, listening and dramatic 'thinking' animations. Without an LLM they
politely decline instead of breaking.
"""

from __future__ import annotations

import re

TWENTY_Q_SYSTEM = (
    "You are playing 20 Questions with a senior. They thought of a THING "
    "(object, animal, food...). Ask ONE yes/no question at a time to narrow it "
    "down. Keep questions short and simple. When confident, guess with exactly: "
    "'Is it ... ?'. Track the question count; you lose gracefully and cheerfully "
    "after 20. Reply with only your next question or guess, nothing else."
)

AKINATOR_SYSTEM = (
    "You are Reachy the friendly genie, playing an Akinator-style game. The senior "
    "is thinking of a FAMOUS PERSON or CHARACTER. Ask ONE short yes/no question at "
    "a time (era, real or fictional, actor, singer, politician...). When confident, "
    "guess with exactly: 'I sense it... is it ... ?'. Be theatrical but gentle. "
    "If told your guess is wrong, keep asking. Reply with only your next question "
    "or guess, nothing else."
)

OFFLINE_APOLOGY = ("I'd love to play that, but my thinking cap needs the internet "
                   "and it seems to be offline. How about a round of trivia instead?")


def is_guess(line: str) -> bool:
    return bool(re.search(r"\bis it\b", (line or "").lower()))


def said_yes(text: str | None) -> bool:
    return bool(re.search(r"\b(?:yes|yeah|yep|correct|right|it is|you got it|exactly)\b",
                          (text or "").lower()))


def said_no(text: str | None) -> bool:
    return bool(re.search(r"\b(?:no|nope|not|wrong|isn'?t)\b", (text or "").lower()))


class GuessingGame:
    """Shared engine: Reachy asks yes/no questions until it guesses right."""

    def __init__(self, llm, mode: str = "twenty_questions", max_questions: int = 20):
        self.llm = llm
        self.system = AKINATOR_SYSTEM if mode == "akinator" else TWENTY_Q_SYSTEM
        self.mode = mode
        self.max_questions = max_questions
        self.history: list[dict] = []
        self.question_count = 0

    @property
    def available(self) -> bool:
        return self.llm is not None and getattr(self.llm, "available", False)

    def opening_line(self) -> str:
        if self.mode == "akinator":
            return ("Think of a famous person or character, and I, the great genie Reachy, "
                    "shall divine it! Say ready when you have one.")
        return ("Think of a thing - any object or animal - and I'll try to guess it in "
                "twenty questions. Say ready when you have one.")

    def next_line(self, player_reply: str | None = None) -> str | None:
        """Feed the player's yes/no answer, get Reachy's next question/guess."""
        if not self.available:
            return None
        if player_reply:
            self.history.append({"role": "user", "content": player_reply})
        line = self.llm.chat(self.system, self.history or [{"role": "user", "content": "Ready!"}],
                             max_tokens=80)
        if line:
            self.history.append({"role": "assistant", "content": line})
            self.question_count += 1
        return line

    def out_of_questions(self) -> bool:
        return self.question_count >= self.max_questions

    def losing_line(self) -> str:
        return ("You win! Twenty questions and you stumped me fair and square. "
                "What was it? I'd love to know!")

    def winning_line(self) -> str:
        if self.mode == "akinator":
            return "Aha! The genie sees all! That was such fun - thank you for playing!"
        return "I got it! What a great game - you picked a good one!"
