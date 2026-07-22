"""The conversation brain: Anthropic Claude or OpenAI, with an offline fallback.

Everything goes through ``LLM.chat(system, messages)`` so the rest of the app
never cares which provider is behind it. When no key/network is available,
``chat`` returns None and callers use their scripted offline behaviour
(jokes bank, local trivia, canned phrases) - the app never crashes.
"""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

ANTHROPIC_MODEL = "claude-haiku-4-5-20251001"  # fast + inexpensive: good for a Pi companion
OPENAI_MODEL = "gpt-4o-mini"


class LLM:
    def __init__(self, settings):
        self.settings = settings
        self._anthropic = None
        self._openai = None

        order = [settings.llm_provider] + [p for p in ("anthropic", "openai")
                                           if p != settings.llm_provider]
        for provider in order:
            if provider == "anthropic" and settings.anthropic_api_key:
                try:
                    import anthropic

                    self._anthropic = anthropic.Anthropic(api_key=settings.anthropic_api_key)
                    logger.info("LLM: Anthropic (%s)", ANTHROPIC_MODEL)
                    break
                except Exception as e:
                    logger.warning("LLM: anthropic package unavailable (%s)", e)
            if provider == "openai" and settings.openai_api_key:
                try:
                    from openai import OpenAI

                    self._openai = OpenAI(api_key=settings.openai_api_key)
                    logger.info("LLM: OpenAI (%s)", OPENAI_MODEL)
                    break
                except Exception as e:
                    logger.warning("LLM: openai package unavailable (%s)", e)
        if not self.available:
            logger.info("LLM: none available - offline behaviours only")

    @property
    def available(self) -> bool:
        return self._anthropic is not None or self._openai is not None

    def chat(self, system: str, messages: list[dict], max_tokens: int = 300) -> str | None:
        """messages: [{"role": "user"|"assistant", "content": str}, ...]"""
        try:
            if self._anthropic is not None:
                response = self._anthropic.messages.create(
                    model=ANTHROPIC_MODEL,
                    system=system,
                    messages=messages,
                    max_tokens=max_tokens,
                )
                return "".join(b.text for b in response.content if b.type == "text").strip()
            if self._openai is not None:
                response = self._openai.chat.completions.create(
                    model=OPENAI_MODEL,
                    messages=[{"role": "system", "content": system}] + messages,
                    max_tokens=max_tokens,
                )
                return (response.choices[0].message.content or "").strip()
        except Exception as e:
            logger.warning("LLM call failed: %s", e)
        return None

    def ask(self, system: str, user_text: str, max_tokens: int = 300) -> str | None:
        return self.chat(system, [{"role": "user", "content": user_text}], max_tokens=max_tokens)
