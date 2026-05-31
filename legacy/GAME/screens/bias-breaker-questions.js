// GAME/screens/bias-breaker-questions.js — Adapter that sources bias questions
// from the main AI Glitch Buster app's quizData.bias bank (defined in index.html).
//
// Format from main app: { question, options: [4 strings], correct: <index of correct> }
// The correct option is at index 0 by convention in quizData but we DON'T assume that —
// we shuffle the options at display time and remember which index is correct.
//
// Phase 3 will replace this adapter with a Quiz Engine that generates questions
// on demand. The shape this file returns will stay identical.
window.GG = window.GG || {};

GG.biasBreakerQuestions = (function() {

  // Small in-bundle fallback so tests + standalone test.html still work
  // even though they don't load the main app's quizData. Real game always
  // uses the main app's much larger bank.
  var FALLBACK = [
    { question: "Why is it wrong if AI blocks some kids just because of their school?",
      options: ["It treats people unfairly based on group", "Schools matter", "Some kids are unsafe", "Computers always know best"], correct: 0 },
    { question: "AI sorts kids into 'good' or 'bad' from a photo. What's wrong?",
      options: ["You can't judge by looks", "Photos are clear", "AI is smart enough", "Names are bad"], correct: 0 },
    { question: "Two kids give the same answer. AI scores one higher just for typing fast. Is it fair?",
      options: ["No — same answer, same score", "Yes — speed matters", "Only if they're older", "Fast is always better"], correct: 0 },
    { question: "What's the BEST way to spot if an AI is being unfair?",
      options: ["Test it with many different people and compare", "Trust it — AI knows", "Ask one expert", "Just read the code"], correct: 0 },
    { question: "AI trained on data from one country misjudges others. What's the problem?",
      options: ["Biased training data", "AI tried its best", "Other countries should change", "Limit it to home"], correct: 0 },
    { question: "An AI denies a kid's tournament spot but his friends got in. What should happen?",
      options: ["Investigate — it might be biased", "Trust the AI", "Wait until next year", "Replace with another AI"], correct: 0 },
    { question: "An AI grades essays lower if they use longer words. Is it biased?",
      options: ["Yes — judging style not meaning", "No — longer is better", "Only for older kids", "Only for one topic"], correct: 0 },
    { question: "You find an AI being unfair. What's the FIRST thing to do?",
      options: ["Tell users AND the makers", "Delete it", "Use less", "Hope it self-fixes"], correct: 0 }
  ];

  function getSource() {
    // Main app declares `const quizData = { bias: [...], hallucination: [...], ... }`
    // at index.html script. Available as a global by name in browsers (const-at-top-level
    // doesn't go on `window` but is in the global lexical scope, accessible by bare name).
    try {
      // eslint-disable-next-line no-undef
      if (typeof quizData !== 'undefined' && quizData && Array.isArray(quizData.bias) && quizData.bias.length > 0) {
        // eslint-disable-next-line no-undef
        return quizData.bias;
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

  // Number of questions currently available from the bank (for tests + analytics).
  function size() {
    return getSource().length;
  }

  return {
    pickN: pickN,
    size: size,
    getSource: getSource
  };
})();
