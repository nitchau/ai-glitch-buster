// GAME/screens/bias-breaker-questions.js — Hand-authored bias/fairness questions.
// Phase 3 will replace this with the AI Quiz Engine. Shape stays the same.
window.GG = window.GG || {};

GG.biasBreakerQuestions = [
  {
    id: 'bb-001',
    grade: 'both',
    question: "A game's AI keeps blocking some kids from joining just because of their school. Is that OK?",
    options: [
      { text: "Yes — the AI knows best",                          correct: false, explanation: "An AI that blocks kids by group isn't fair. Fair AI treats everyone the same." },
      { text: "No — that's unfair to judge by group",             correct: true,  motivation: "Exactly! Fair AI shouldn't decide based on which school you're from." },
      { text: "Only if the school is new",                        correct: false, explanation: "School age has nothing to do with whether you should get to play." },
      { text: "Yes — only winners should play",                   correct: false, explanation: "That would just keep some people locked out forever. Not fair." }
    ]
  },
  {
    id: 'bb-002',
    grade: 'both',
    question: "An AI sorts kids into 'good' or 'bad' players just from their photo. What's wrong with that?",
    options: [
      { text: "Nothing — AI is smart",                            correct: false, explanation: "You can't tell who's a good player from a photo. The AI is being biased." },
      { text: "Photos can be misleading and unfair",              correct: true,  motivation: "Right! AI shouldn't judge people by how they look." },
      { text: "Only old photos are bad",                          correct: false, explanation: "Any photo could be misleading — age doesn't fix the bias." },
      { text: "The AI should also use names",                     correct: false, explanation: "Adding more guessable info doesn't make a bad system fair." }
    ]
  },
  {
    id: 'bb-003',
    grade: 'both',
    question: "Two players send the same answer. The AI gives a higher score to one because they typed faster. Is that fair?",
    options: [
      { text: "Yes — fast typing matters",                        correct: false, explanation: "The QUESTION was about the answer, not typing speed. Mixing the two is unfair." },
      { text: "No — same answer should get the same score",       correct: true,  motivation: "Exactly. Fair AI judges what was asked, not unrelated stuff." },
      { text: "Only if both kids are in grade 5",                 correct: false, explanation: "Grade doesn't change the rule — same answer should mean same score." },
      { text: "Fast is always better",                            correct: false, explanation: "Speed wasn't the question. Adding it is bias." }
    ]
  },
  {
    id: 'bb-004',
    grade: 'both',
    question: "An AI was trained only on data from one country. Now it makes mistakes about kids from other countries. What's the problem?",
    options: [
      { text: "Nothing — the AI tried its best",                  correct: false, explanation: "Trying isn't enough. Biased training data leads to biased decisions about real people." },
      { text: "The training data was biased",                     correct: true,  motivation: "Yes! AI is only as fair as the data it learns from. Bad data = biased AI." },
      { text: "The other countries should change",                correct: false, explanation: "It's the AI's job to be fair — not other people's job to change to match it." },
      { text: "It should only be used at home",                   correct: false, explanation: "Even at home, biased AI hurts visitors. The AI should be fixed, not restricted." }
    ]
  },
  {
    id: 'bb-005',
    grade: 'both',
    question: "What's the BEST way to spot if an AI is being unfair?",
    options: [
      { text: "Trust it — AI doesn't make mistakes",              correct: false, explanation: "AI definitely makes mistakes. Always check its decisions on real people." },
      { text: "Test it with many different people, compare results", correct: true, motivation: "Yes! Compare how it treats different groups. Big differences = bias." },
      { text: "Ask only one expert",                              correct: false, explanation: "One opinion isn't enough. Bias shows up in patterns across many users." },
      { text: "Read its code only",                               correct: false, explanation: "The code might LOOK fair but the data might not be. Test with real diverse users." }
    ]
  },
  {
    id: 'bb-006',
    grade: 'both',
    question: "BOSS: An AI denies a kid a chess-tournament spot, citing 'data patterns.' The kid's friends with similar skills got in. What should happen?",
    options: [
      { text: "The kid should accept it — AI knows best",         correct: false, explanation: "Never trust an AI's decision blindly, especially when it affects opportunities." },
      { text: "Investigate — the AI may be discriminating",       correct: true,  motivation: "Right! Friends with similar skills getting different results is a bias red flag." },
      { text: "Train a different AI to overrule it",              correct: false, explanation: "Adding more AI doesn't fix the bias — investigate the original one." },
      { text: "Wait until next year",                             correct: false, explanation: "Waiting doesn't fix bias. The kid deserves a fair answer NOW." }
    ]
  },
  {
    id: 'bb-007',
    grade: 'both',
    question: "BOSS: A teacher uses an AI to grade essays. It gives lower scores to essays with longer words. Is that biased?",
    options: [
      { text: "No — longer words are always better",              correct: false, explanation: "Longer doesn't mean better. The AI is biased toward style, not quality." },
      { text: "Yes — it's judging style instead of meaning",      correct: true,  motivation: "Yes! Fair grading looks at WHAT was said, not letter count." },
      { text: "Only if the essay was about animals",              correct: false, explanation: "Topic doesn't matter — the bias is in the scoring rules." },
      { text: "It's OK if the kids are old enough",               correct: false, explanation: "Age doesn't make biased grading fair." }
    ]
  },
  {
    id: 'bb-008',
    grade: 'both',
    question: "BOSS: You discover an AI is being unfair. What's the FIRST thing to do?",
    options: [
      { text: "Delete the AI right away",                         correct: false, explanation: "Deleting is extreme. Understand WHY it's unfair first so we can fix the root cause." },
      { text: "Tell people who use it AND the team who made it",  correct: true,  motivation: "Right! Speak up. Both users and makers need to know." },
      { text: "Use it less often",                                correct: false, explanation: "Using it less still hurts the people it affects. Fix it, don't hide from it." },
      { text: "Hope it fixes itself",                             correct: false, explanation: "AI doesn't fix itself. Humans must find the bias and correct it." }
    ]
  }
];
