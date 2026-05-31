// GAME/screens/habit-harbor-questions.js — Adapter that sources bad-habit
// questions from the main AI Glitch Buster app's quizData["bad-habits"] bank
// (defined in index.html).
//
// Format from main app: { question, options: [4 strings], correct: <index> }
// Correct is at index 0 by convention; the game shuffles options at display
// time and remembers which index is correct (same as the bias adapter).
//
// Mirrors GAME/screens/bias-breaker-questions.js exactly — only the source key
// (quizData["bad-habits"]) and the fallback pool differ.
window.GG = window.GG || {};

GG.habitHarborQuestions = (function() {

  // In-bundle fallback so tests + standalone test.html still work even though
  // they don't load the main app's quizData. Real game uses the much larger
  // quizData["bad-habits"] bank (~60 questions). These 8 are taken verbatim
  // from that bank so the fallback stays on-message.
  var FALLBACK = [
    { question: "How can we stop AI from learning bad words?",
      options: ["Use kind and clean language when training or chatting", "Teach it more bad words", "Ignore what it says", "Laugh when it says something rude"], correct: 0 },
    { question: "What should you do when an AI says something mean?",
      options: ["Tell it the comment is hurtful and help fix it", "Say mean things back", "Ignore it forever", "Encourage it to say worse things"], correct: 0 },
    { question: "How can we help AI when it guesses wrong answers?",
      options: ["Remind it to say 'I don't know' if unsure", "Reward random guesses", "Ignore mistakes", "Tell it to guess faster"], correct: 0 },
    { question: "How do we prevent AI from copying spelling errors?",
      options: ["Type carefully and use spell check", "Add more typos", "Ask AI to guess your spelling", "Leave mistakes on purpose"], correct: 0 },
    { question: "When AI makes up stories for attention, what should you do?",
      options: ["Remind it to share true or clear information", "Ask for more fake stories", "Believe what it says", "Share the story online"], correct: 0 },
    { question: "How can we fix AI talking too fast after many questions?",
      options: ["Ask one question at a time", "Keep interrupting it", "Spam it with messages", "Complain about it"], correct: 0 },
    { question: "If AI tells a joke that might hurt feelings, what's best to do?",
      options: ["Teach it to use kind humor", "Laugh even if it's mean", "Save the joke", "Share it anyway"], correct: 0 },
    { question: "How can we help AI that gets confused easily?",
      options: ["Be clear and simple in instructions", "Talk in riddles", "Confuse it more", "Give long, messy questions"], correct: 0 }
  ];

  function getSource() {
    // Main app declares `const quizData = { "bad-habits": [...], ... }` at the
    // index.html script. NOTE the hyphenated key — must use bracket access.
    try {
      // eslint-disable-next-line no-undef
      if (typeof quizData !== 'undefined' && quizData && Array.isArray(quizData["bad-habits"]) && quizData["bad-habits"].length > 0) {
        // eslint-disable-next-line no-undef
        return quizData["bad-habits"];
      }
    } catch (e) { /* ignore */ }
    return FALLBACK;
  }

  // Return N random questions from the bank, without repeats within this draw.
  function pickN(n) {
    var src = getSource();
    var pool = src.slice();
    for (var i = pool.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
    }
    return pool.slice(0, Math.min(n, pool.length));
  }

  // Number of questions currently available from the bank (tests + analytics).
  function size() {
    return getSource().length;
  }

  // Turn a question into a shuffled list of choices, each tagged isCorrect.
  // The bank stores the correct answer at index `correct` (0 by convention),
  // so we MUST shuffle or the right answer is always first. Does not mutate q.
  function toChoices(q) {
    var idx = [0, 1, 2, 3];
    for (var i = idx.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = idx[i]; idx[i] = idx[j]; idx[j] = t;
    }
    return idx.map(function (oi) {
      return { text: q.options[oi], isCorrect: oi === q.correct };
    });
  }

  return {
    pickN: pickN,
    size: size,
    getSource: getSource,
    toChoices: toChoices
  };
})();
