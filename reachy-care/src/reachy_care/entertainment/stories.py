"""Short original stories, told aloud. LLM-fresh when online, built-ins offline."""

from __future__ import annotations

import random

BUILTIN_STORIES: list[tuple[str, str]] = [
    ("The Lighthouse Cat",
     "Once upon a time, a small grey cat named Pearl lived in a lighthouse by the sea. "
     "Every evening she climbed the one hundred spiral steps to sit beside the great lamp. "
     "The keeper said she was checking his work, and perhaps she was. "
     "One foggy night, a fishing boat lost its way, and Pearl's silhouette in the lamplight - "
     "tail curled like a question mark - was the first thing the sailors saw. "
     "From that day on, every boat in the harbour kept a little tin of sardines aboard, "
     "just in case Pearl ever came to visit. And she often did."),
    ("The Garden Swap",
     "Two neighbours, Rosa and Albert, had gardens separated by a low stone wall. "
     "Rosa grew tomatoes that refused to ripen; Albert grew roses that refused to bloom. "
     "One spring, without a word, they swapped a few seedlings over the wall. "
     "By August, Rosa's roses were the talk of the street and Albert's tomatoes won a "
     "ribbon at the fair. When people asked their secret, they both gave the same answer: "
     "a good neighbour, and a low enough wall to pass things over."),
    ("The Sunday Radio",
     "Every Sunday, Mr. Bell wound the old radio in his kitchen and danced - badly, "
     "and with great joy - while his tea went cold. One Sunday the radio finally gave out. "
     "The silence lasted exactly one week, because the next Sunday, his grandchildren "
     "arrived with a new radio, a lemon cake, and strict instructions from their mother: "
     "'Learn Grandpa's dance before you come home.' The tea, as always, went cold."),
]

STORY_LLM_PROMPT = (
    "Tell one original, gentle short story for a senior listener, about 150 words. "
    "Warm, cozy and hopeful - small everyday magic, kind characters, a happy or "
    "peaceful ending. Nothing scary, sad or violent. Reply with the story only."
)


class StoryTeller:
    def __init__(self, llm=None):
        self.llm = llm

    def tell(self, topic: str | None = None) -> str:
        if self.llm is not None and getattr(self.llm, "available", False):
            ask = f"A story about {topic}, please." if topic else "A story, please."
            story = self.llm.ask(STORY_LLM_PROMPT, ask, max_tokens=400)
            if story:
                return story
        title, story = random.choice(BUILTIN_STORIES)
        return f"This one is called {title}. {story}"
