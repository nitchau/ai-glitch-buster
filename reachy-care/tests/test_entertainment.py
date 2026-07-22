from reachy_care.entertainment.jokes import JOKE_BANK, JokeTeller
from reachy_care.entertainment.stories import BUILTIN_STORIES, StoryTeller
from reachy_care.entertainment.trivia import (
    CATEGORIES, TriviaGame, check_answer, normalize_answer,
)
from reachy_care.entertainment.games import GuessingGame, is_guess, said_no, said_yes
from reachy_care.entertainment.radio import RadioPlayer, STATIONS


BANNED_WORDS = ("stupid", "idiot", "dumb", "ugly", "fat", "old people", "senile")


def test_joke_bank_is_kind_and_offline():
    assert len(JOKE_BANK) >= 20
    for joke in JOKE_BANK:
        assert not any(w in joke.lower() for w in BANNED_WORDS), joke
    teller = JokeTeller(llm=None)
    jokes = {teller.tell() for _ in range(5)}
    assert jokes <= set(JOKE_BANK)
    assert len(jokes) >= 2  # no immediate repeats


def test_stories_offline():
    told = StoryTeller(llm=None).tell()
    assert any(title in told for title, _ in BUILTIN_STORIES)


def test_trivia_answer_checking():
    assert check_answer("elvis", "Elvis Presley", ["elvis"])
    assert check_answer("The Beatles!", "The Beatles", ["beatles"])
    assert check_answer("I think it was 1969", "1969", [])
    assert not check_answer("madonna", "Elvis Presley", ["elvis"])
    assert not check_answer("", "Elvis Presley", [])
    assert not check_answer(None, "Elvis Presley", [])


def test_normalize_strips_fillers():
    assert normalize_answer("Um, I think it is The Titanic.") == "titanic"


def test_trivia_game_flow():
    game = TriviaGame(category="history", difficulty=2)
    assert game.category == "history"
    question = game.next_question()
    assert question is not None
    correct, feedback = game.grade(question, question.answer)
    assert correct and game.score == 1
    # kindness rule: wrong answers still get a warm reply with the right answer
    question2 = game.next_question()
    correct2, feedback2 = game.grade(question2, "definitely wrong answer")
    assert not correct2
    assert question2.answer.lower().split()[-1] in feedback2.lower()
    assert "out of" in game.final_line()


def test_trivia_category_matching():
    assert TriviaGame(category="some fifties and 50s and 60s music please").category in CATEGORIES
    assert TriviaGame(category=None).category in CATEGORIES


def test_guessing_game_helpers():
    assert is_guess("Is it Elvis Presley?")
    assert not is_guess("Does the person sing?")
    assert said_yes("yes it is!") and said_yes("you got it")
    assert said_no("no, not that") and not said_no("yes")


def test_guessing_game_without_llm_is_polite():
    game = GuessingGame(llm=None)
    assert not game.available
    assert game.next_line("ready") is None


def test_radio_station_matching():
    assert RadioPlayer.match_station("play some jazz please") == "jazz"
    assert RadioPlayer.match_station("put on the news") == "news"
    assert RadioPlayer.match_station("play something relaxing") == "relaxing"
    assert RadioPlayer.match_station("play music") in STATIONS


def test_radio_stop_without_playing():
    player = RadioPlayer()
    assert "already off" in player.stop()
