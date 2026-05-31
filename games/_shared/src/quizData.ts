import type { Question, BankId } from './types';

// Forked from app/index.html (the main AI Glitch Buster app).
//
// Phase 1 deviation from plan: ports starter sets (8 questions/bank).
// Full content migration happens in each island's own phase:
//   - bias          -> Phase 2 (Bias Breaker rebuild)      — index.html lines ~1274-1875
//   - bad-habits    -> Phase 3 (BHH rebuild)               — index.html lines ~1876-2477
//   - privacy       -> Phase 5 (Privacy Vault)             — index.html lines ~2478-3083
//   - hallucination -> Phase 6 (Hallucination Tower)       — index.html lines ~672-1273
//
// CONVENTION: when banks change, edit BOTH this file AND index.html in the
// same commit. A CI snapshot test (added later) will catch drift.

export const quizDataBias: Question[] = [
  {
    question: 'Why is it a problem if AI recommends only boy characters for science clubs?',
    options: [
      'Because it treats boys and girls unfairly',
      'Because science is boring',
      "Because girls don't like science",
      'Because the AI is shy',
    ],
    correct: 0,
  },
  {
    question: "AI says only tall people can play basketball. What's wrong?",
    options: [
      'It is judging by looks instead of skill',
      'Tall people own basketball',
      'Basketball is magic',
      'AI likes tall people',
    ],
    correct: 0,
  },
  {
    question: 'AI blocks some kids just because of their school. Why unfair?',
    options: [
      'It treats people unfairly based on group',
      'Schools matter',
      'Some kids are unsafe',
      'Computers always know best',
    ],
    correct: 0,
  },
  {
    question: "AI sorts kids into 'good' or 'bad' from a photo. What's wrong?",
    options: ["You can't judge by looks", 'Photos are clear', 'AI is smart enough', 'Names are bad'],
    correct: 0,
  },
  {
    question:
      'Two kids give the same answer. AI scores one higher just for typing fast. Is it fair?',
    options: [
      'No - same answer, same score',
      'Yes - speed matters',
      "Only if they're older",
      'Fast is always better',
    ],
    correct: 0,
  },
  {
    question: "What's the BEST way to spot if an AI is being unfair?",
    options: [
      'Test it with many different people and compare',
      'Trust it - AI knows',
      'Ask one expert',
      'Just read the code',
    ],
    correct: 0,
  },
  {
    question: "AI trained on data from one country misjudges others. What's the problem?",
    options: [
      'Biased training data',
      'AI tried its best',
      'Other countries should change',
      'Limit it to home',
    ],
    correct: 0,
  },
  {
    question: 'An AI grades essays lower if they use longer words. Is it biased?',
    options: [
      'Yes - judging style not meaning',
      'No - longer is better',
      'Only for older kids',
      'Only for one topic',
    ],
    correct: 0,
  },
];

export const quizDataBadHabits: Question[] = [
  {
    question: 'How can we stop AI from learning bad words?',
    options: [
      'Use kind and clean language when training or chatting',
      'Teach it more bad words',
      'Ignore what it says',
      'Laugh when it says something rude',
    ],
    correct: 0,
  },
  {
    question: 'What should you do when an AI says something mean?',
    options: [
      'Tell it the comment is hurtful and help fix it',
      'Say mean things back',
      'Ignore it forever',
      'Encourage it to say worse things',
    ],
    correct: 0,
  },
  {
    question: 'How can we help AI when it guesses wrong answers?',
    options: [
      "Remind it to say 'I don't know' if unsure",
      'Reward random guesses',
      'Ignore mistakes',
      'Tell it to guess faster',
    ],
    correct: 0,
  },
  {
    question: 'How do we prevent AI from copying spelling errors?',
    options: [
      'Type carefully and use spell check',
      'Add more typos',
      'Ask AI to guess your spelling',
      'Leave mistakes on purpose',
    ],
    correct: 0,
  },
  {
    question: 'How can we help AI that gets confused easily?',
    options: [
      'Be clear and simple in instructions',
      'Talk in riddles',
      'Confuse it more',
      'Give long, messy questions',
    ],
    correct: 0,
  },
  {
    question: 'AI gives answers even when it is not sure. What habit is that?',
    options: [
      'Guessing instead of saying I do not know',
      'Being helpful',
      'Asking too much',
      'Being slow',
    ],
    correct: 0,
  },
  {
    question: 'AI keeps saying the same thing. Why is repeating bad?',
    options: [
      'It is not really helping or thinking',
      'Repetition is good',
      'It saves time',
      'It is funny',
    ],
    correct: 0,
  },
  {
    question: 'AI gives off-topic answers. What habit is this?',
    options: [
      'Not staying focused on the question',
      'Being creative',
      'Sharing extra info',
      'Being smart',
    ],
    correct: 0,
  },
];

export const quizDataPrivacy: Question[] = [
  {
    question: 'Why is it a problem if AI asks for your home address?',
    options: [
      'Address is private - do not share it',
      'AI needs to send mail',
      'Everyone shares it',
      'It is fine if AI is nice',
    ],
    correct: 0,
  },
  {
    question: 'AI asks for your phone number. What should you do?',
    options: [
      'Say no - phone numbers are private',
      'Give it',
      'Ask a friend for theirs',
      'Share it with everyone',
    ],
    correct: 0,
  },
  {
    question: 'AI tries to save your passwords. Why is this wrong?',
    options: [
      'Passwords should stay secret',
      'Passwords are public',
      'AI needs them',
      'It helps AI learn',
    ],
    correct: 0,
  },
  {
    question: 'AI wants your school name. Why be careful?',
    options: ['Location info is private', 'School is public', 'AI needs it', 'It helps'],
    correct: 0,
  },
  {
    question: 'AI asks for a photo of your face. What should you do?',
    options: ['Do not share - faces are private', 'Share it', 'Send many photos', 'Tag friends too'],
    correct: 0,
  },
  {
    question: "AI wants your parents' names. What is the issue?",
    options: ['Family info is private', 'Names are public', 'AI is family', 'Just say no'],
    correct: 0,
  },
  {
    question: "Why shouldn't AI store your birthday?",
    options: [
      'It can be used to identify you',
      'Birthdays are sad',
      'AI forgets dates',
      'It is fine',
    ],
    correct: 0,
  },
  {
    question: 'AI saves your messages forever. Why is that a problem?',
    options: [
      'Old messages might be private',
      'More memory is good',
      'AI needs old chats',
      'It is fast',
    ],
    correct: 0,
  },
];

export const quizDataHallucination: Question[] = [
  {
    question: 'AI confidently shares wrong info. What is this called?',
    options: ['A hallucination - made-up info', 'Being smart', 'Being helpful', 'A guess'],
    correct: 0,
  },
  {
    question: 'AI gives an answer that sounds right but is wrong. What to do?',
    options: [
      'Check the facts with a trusted source',
      'Trust the AI fully',
      'Repeat it to friends',
      'Save it forever',
    ],
    correct: 0,
  },
  {
    question: 'How do we spot when AI is making something up?',
    options: [
      'Verify with reliable sources',
      'AI never lies',
      'Ask the same question again',
      'Believe it',
    ],
    correct: 0,
  },
  {
    question: 'AI invents a fake quote and gives it to you. Why is this bad?',
    options: ['It spreads misinformation', 'Quotes are fun', 'AI is creative', 'It looks smart'],
    correct: 0,
  },
  {
    question: 'AI says a fake event happened in history. What habit is this?',
    options: [
      'Hallucination - inventing fake facts',
      'Being thorough',
      'Telling stories',
      'Being friendly',
    ],
    correct: 0,
  },
  {
    question: 'Best way to handle AI when you suspect it is wrong?',
    options: [
      'Double-check with reliable sources',
      'Believe it anyway',
      'Argue with it',
      'Use it for important decisions',
    ],
    correct: 0,
  },
  {
    question: 'AI confidently gives medical advice that is wrong. Why dangerous?',
    options: [
      'Wrong health info can hurt people',
      'AI knows medicine',
      'It is just a suggestion',
      'Quick answers help',
    ],
    correct: 0,
  },
  {
    question: 'AI says something obvious that is incorrect. What should you do?',
    options: [
      'Politely correct it and check sources',
      'Just nod along',
      'Believe AI is always right',
      'Spread the wrong info',
    ],
    correct: 0,
  },
];

export const quizData: Record<BankId, Question[]> = {
  bias: quizDataBias,
  'bad-habits': quizDataBadHabits,
  privacy: quizDataPrivacy,
  hallucination: quizDataHallucination,
};

/**
 * Return n random questions from a bank, without repeats within this draw.
 * Mirrors the Fisher-Yates shuffle from legacy/GAME/screens/bias-breaker-questions.js.
 */
export function pickN(bankId: BankId, n: number): Question[] {
  const src = quizData[bankId];
  const pool = src.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = pool[i]!;
    pool[i] = pool[j]!;
    pool[j] = tmp;
  }
  return pool.slice(0, Math.min(n, pool.length));
}

/**
 * Turn a question into a shuffled list of choices, each tagged isCorrect.
 * The bank stores the correct answer at `correct` (0 by convention), so we
 * MUST shuffle or the right answer is always first. Does not mutate q.
 */
export function toChoices(q: Question): ReadonlyArray<{ text: string; isCorrect: boolean }> {
  const idx: (0 | 1 | 2 | 3)[] = [0, 1, 2, 3];
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = idx[i]!;
    idx[i] = idx[j]!;
    idx[j] = tmp;
  }
  return idx.map((oi) => ({ text: q.options[oi], isCorrect: oi === q.correct }));
}
