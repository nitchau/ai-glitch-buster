"""Persistent memories: family names, birthdays, preferences, stories.

Stored locally in SQLite, retrieved by simple keyword scoring, and woven into
the LLM system prompt so Reachy remembers naturally ("How was the visit with
your grandson last weekend?"). Nothing ever leaves the robot except the few
lines injected into an LLM call.
"""

from __future__ import annotations

import re
from datetime import datetime

_STOPWORDS = {
    "the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "i", "my",
    "me", "you", "your", "that", "this", "it", "of", "to", "in", "on", "at",
    "do", "did", "have", "has", "had", "please", "remember", "forget", "don't",
    "about", "with", "for", "what", "when", "who", "how", "tell",
}


def _keywords(text: str) -> set[str]:
    words = re.findall(r"[a-z']+", (text or "").lower())
    return {w for w in words if w not in _STOPWORDS and len(w) > 2}


class MemoryStore:
    def __init__(self, db):
        self.db = db

    def remember(self, text: str, category: str = "general") -> str:
        """Store one memory. Returns the confirmation line to speak."""
        cleaned = re.sub(r"^(?:please\s+)?remember\s+(?:that\s+)?", "", text.strip(),
                         flags=re.IGNORECASE).strip() or text.strip()
        self.db.add_memory(cleaned, category)
        return f"Got it - I'll remember that {cleaned}."

    def relevant(self, query: str | None, limit: int = 5) -> list[str]:
        """Memories relevant to the query (keyword overlap), newest-first ties."""
        memories = self.db.memories()
        if not memories:
            return []
        if not query:
            return [m["text"] for m in memories[:limit]]
        query_words = _keywords(query)
        scored = []
        for m in memories:
            overlap = len(query_words & _keywords(m["text"]))
            scored.append((overlap, m["id"], m["text"]))
        scored.sort(key=lambda t: (-t[0], -t[1]))
        hits = [text for overlap, _, text in scored if overlap > 0][:limit]
        return hits or [m["text"] for m in memories[:2]]

    def recall_line(self, query: str | None) -> str:
        hits = self.relevant(query, limit=3)
        if not hits:
            return ("I don't have anything written down yet. Tell me things to remember - "
                    "birthdays, names, favourite things - and I'll keep them safe.")
        return "Here's what I remember: " + ". ".join(hits) + "."

    def context_for_conversation(self, latest_utterance: str | None) -> list[str]:
        """A few memories to weave into the LLM system prompt."""
        recent = [m["text"] for m in self.db.memories(limit=3)]
        matched = self.relevant(latest_utterance, limit=3) if latest_utterance else []
        seen: list[str] = []
        for text in matched + recent:
            if text not in seen:
                seen.append(text)
        return seen[:5]


MEMORY_EXTRACT_PROMPT = (
    "From this conversation snippet, extract at most one short personal fact worth "
    "remembering about the senior (a name, relationship, date, preference or story). "
    "Write it as one third-person sentence, e.g. 'Her grandson Leo visits on Sundays.' "
    "If there is nothing personal worth keeping, reply exactly: NONE"
)


def maybe_auto_remember(store: MemoryStore, llm, user_text: str) -> None:
    """Quietly save personal facts the senior shares mid-conversation."""
    if llm is None or not getattr(llm, "available", False):
        return
    if len(_keywords(user_text)) < 3:
        return
    fact = llm.ask(MEMORY_EXTRACT_PROMPT, user_text, max_tokens=50)
    if fact and "NONE" not in fact.upper() and len(fact) < 200:
        store.db.add_memory(fact.strip(), "auto")
