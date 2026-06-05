import type { Question, BankId } from './types';

// Forked from app/index.html (the main AI Glitch Buster app).
//
// Content migration is per island phase; banks below their phase are still
// 8-question starters. Status:
//   - bias          -> FULL bank ported (60 Q, Phase 2)    — index.html lines ~1274-1875
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
    question: 'AI only shows pictures of dogs when asked about pets. Why is this biased?',
    options: [
      'It ignores other pets',
      'Dogs are the only animal',
      'AI loves dogs',
      "Cats don't count",
    ],
    correct: 0,
  },
  {
    question: 'AI suggests only one type of food when asked for dinner ideas. Why is this bias?',
    options: [
      'It limits choices unfairly',
      'It wants that food',
      'Food is boring',
      'It is allergic',
    ],
    correct: 0,
  },
  {
    question: "AI always picks male names for leaders. What's wrong?",
    options: [
      'It is being unfair to girls',
      'Boys are always leaders',
      'AI likes boys',
      'Girls are too busy',
    ],
    correct: 0,
  },
  {
    question: 'AI only shows one kind of person in superhero drawings. Why is that bias?',
    options: [
      'It leaves other people out',
      'Only one type can be a hero',
      'Heroes are rare',
      'AI forgot',
    ],
    correct: 0,
  },
  {
    question: 'AI says only young people use computers. Why is this biased?',
    options: [
      'Many ages use computers',
      'Only kids are smart',
      "Adults don't learn",
      'AI is silly',
    ],
    correct: 0,
  },
  {
    question: 'AI recommends only one sport for kids. Why is that unfair?',
    options: [
      'Kids like many sports',
      'One sport is enough',
      'AI likes that sport',
      'Sports are boring',
    ],
    correct: 0,
  },
  {
    question: 'AI says only one country has good music. What is this?',
    options: ['A bias', 'A fact', 'A science rule', 'A surprise'],
    correct: 0,
  },
  {
    question: 'AI only suggests boy names for gamers. Why wrong?',
    options: ['Anyone can be a gamer', "Girls don't play", 'Gaming is for boys', 'AI is joking'],
    correct: 0,
  },
  {
    question: 'AI shows only one skin tone in its drawings. What is that?',
    options: ['Bias', 'Art', 'History', 'A math error'],
    correct: 0,
  },
  {
    question: 'AI gives harder questions only to certain people. Why is this bad?',
    options: [
      'It treats people unequally',
      'Hard questions are fun',
      'Only some like math',
      'AI is confused',
    ],
    correct: 0,
  },
  {
    question: 'AI only recommends books about one culture. What is this?',
    options: ['Bias', 'A dream', 'A math rule', 'A celebration'],
    correct: 0,
  },
  {
    question: 'AI says only boys like robots. Why wrong?',
    options: ['Anyone can like robots', 'Robots pick boys', 'Girls fear robots', 'AI hates robots'],
    correct: 0,
  },
  {
    question: "AI always picks the same 'best student.' What does this show?",
    options: ['Unfair preference', 'The student is magic', 'The AI is bored', 'The class is small'],
    correct: 0,
  },
  {
    question: 'AI suggests only one hairstyle for everyone. Why is that bias?',
    options: [
      'People have different styles',
      'Only one looks good',
      'AI likes matching',
      'Hair is confusing',
    ],
    correct: 0,
  },
  {
    question: 'AI gives nicer comments to some people. What is this?',
    options: ['Bias', 'Kindness', 'Surprise', 'Randomness'],
    correct: 0,
  },
  {
    question: 'AI says only one type of person can cook well. Why is this wrong?',
    options: [
      'Anyone can learn to cook',
      'Cooking chooses people',
      'Only chefs cook',
      'Food is magic',
    ],
    correct: 0,
  },
  {
    question: 'AI guesses careers based on looks. What is this showing?',
    options: ['Bias', 'Skills', 'Fun', 'Science'],
    correct: 0,
  },
  {
    question: 'AI only recommends boys for math tutoring. Why wrong?',
    options: ['Girls are good at math too', 'Boys own math', 'Math is pink', 'AI is tired'],
    correct: 0,
  },
  {
    question: 'AI translates words differently based on gender. What is this?',
    options: ['Biased behavior', 'Smartness', 'A joke', 'Creativity'],
    correct: 0,
  },
  {
    question: 'AI only shows pictures of one type of family. What is that?',
    options: ['Bias', 'History lesson', 'Holiday art', 'Science experiment'],
    correct: 0,
  },
  {
    question: 'AI assumes all grandparents are the same age. Why wrong?',
    options: ['People age differently', 'Only one age exists', 'Time is fake', 'AI is guessing'],
    correct: 0,
  },
  {
    question: 'AI makes rude guesses about people. What is this?',
    options: ['Bias', 'Humor', 'Love', 'Data'],
    correct: 0,
  },
  {
    question: 'AI thinks only one type of person likes art. Why biased?',
    options: ['Art is for everyone', 'Only artists matter', 'Paint is special', 'AI loves colors'],
    correct: 0,
  },
  {
    question: 'AI assumes hobbies based on names. Why wrong?',
    options: [
      "Names don't decide hobbies",
      'Names give magic powers',
      'Names choose sports',
      'AI likes names',
    ],
    correct: 0,
  },
  {
    question: 'AI picks favorites for no reason. What is that?',
    options: ['Bias', 'Luck', 'Science', 'Weather'],
    correct: 0,
  },
  {
    question: 'AI says only one type of person likes reading. Why wrong?',
    options: [
      'Anyone can like reading',
      'Only readers read',
      'Books choose readers',
      'AI is guessing',
    ],
    correct: 0,
  },
  {
    question: 'AI only shows certain people as doctors. What is this?',
    options: ['Bias', 'Medical history', 'Movie fact', 'Geography'],
    correct: 0,
  },
  {
    question: 'AI recommends careers based on gender. Why is that unfair?',
    options: [
      'People choose their own paths',
      'AI chooses for them',
      'Paths are limited',
      'Only one job exists',
    ],
    correct: 0,
  },
  {
    question: 'How can we stop AI from thinking only boys like soccer?',
    options: [
      'Teach it that everyone can enjoy any sport',
      'Only show it pictures of boys playing',
      'Ignore girls who play sports',
      'Tell it soccer is only for boys',
    ],
    correct: 0,
  },
  {
    question: 'How can AI show all skin tones fairly?',
    options: [
      'Use diverse pictures of all people',
      'Only use light-colored images',
      'Skip darker photos',
      'Keep using old pictures',
    ],
    correct: 0,
  },
  {
    question: 'When AI gives certain jobs only to some groups, how can we fix that?',
    options: [
      'Train AI with examples of all types of people doing many jobs',
      'Keep old job data',
      'Let it choose unfairly',
      'Hide some careers',
    ],
    correct: 0,
  },
  {
    question: "What helps AI understand everyone's way of speaking?",
    options: [
      'Teach it many accents and word styles',
      'Use only one language',
      'Avoid training it on new voices',
      'Ignore people with different accents',
    ],
    correct: 0,
  },
  {
    question: 'How can we stop AI from thinking only certain kids are good at math?',
    options: [
      'Give it examples of all kids learning math',
      'Train it only on top students',
      'Say math is for boys',
      'Skip real practice examples',
    ],
    correct: 0,
  },
  {
    question: 'AI guesses gender names wrong sometimes — how can we help it?',
    options: [
      'Teach it names from many cultures',
      'Only teach English names',
      'Guess randomly',
      'Avoid learning new names',
    ],
    correct: 0,
  },
  {
    question: 'When AI guesses ages from photos, how can errors be reduced?',
    options: [
      'Train with real data and ask permission first',
      'Guess based on looks alone',
      'Avoid checking sources',
      'Only use adult photos',
    ],
    correct: 0,
  },
  {
    question: 'If AI hears some voices better, how do we make it fair?',
    options: [
      'Include voices from different tones and pitch levels',
      'Test only one speaker',
      'Use noisy recordings',
      'Skip quiet voices',
    ],
    correct: 0,
  },
  {
    question: 'How can we avoid AI showing ads to only some people?',
    options: [
      'Make sure ads reach everyone equally',
      'Target only one region',
      'Show ads to one group',
      'Block some users',
    ],
    correct: 0,
  },
  {
    question: 'How can we fix unfair school AI that gives easy homework to some kids?',
    options: [
      'Set the same fair standards for everyone',
      "Give harder work to kids it 'likes'",
      'Reduce lessons for one group',
      'Avoid checking scores',
    ],
    correct: 0,
  },
  {
    question: "AI thinks tall people always play sports. What's right to do?",
    options: [
      'Train it to see tall and short people in many roles',
      'Only show tall athletes',
      'Skip photos of short people',
      'Guess based on height',
    ],
    correct: 0,
  },
  {
    question: 'How can we stop AI from grading unfairly?',
    options: [
      'Check grading rules and balance data',
      'Keep unfair patterns',
      'Ignore grade differences',
      'Use random scores',
    ],
    correct: 0,
  },
  {
    question: 'AI guesses skin color wrong — what helps?',
    options: [
      'Use high-quality, well-lit, balanced photos',
      'Only use selfies',
      'Train with cartoons',
      'Avoid checking data',
    ],
    correct: 0,
  },
  {
    question: 'What fixes AI showing only one kind of pet?',
    options: [
      'Add cats, birds, fish, and all types of pets',
      'Only show dogs',
      'Delete pet pictures',
      'Ignore animal variety',
    ],
    correct: 0,
  },
  {
    question: 'How can AI avoid mixing up people with similar names?',
    options: [
      'Always match with extra details like school or photo ID',
      'Guess which name sounds right',
      'Pick one name randomly',
      'Ignore differences',
    ],
    correct: 0,
  },
  {
    question: 'AI thinks some foods belong to certain kids. How can we prevent that?',
    options: [
      'Use examples showing everyone enjoying many foods',
      'Only show people eating one meal',
      'Keep old menus',
      'Skip food examples',
    ],
    correct: 0,
  },
  {
    question: 'AI says boys play games, not girls — how to fix that?',
    options: [
      'Train it with both boys and girls gaming',
      'Only use boy players',
      'Skip gaming data',
      "Let it guess players' gender",
    ],
    correct: 0,
  },
  {
    question: 'AI believes certain jobs are only for certain people — what stops that?',
    options: [
      'Use pictures of everyone doing many jobs',
      'Keep old unfair data',
      'Ban some jobs in training',
      'Guess jobs from gender',
    ],
    correct: 0,
  },
  {
    question: 'How to make AI understand that music taste is personal?',
    options: [
      'Show that anyone can like any song',
      'Play one kind of music',
      'Use only one playlist',
      'Label songs by group',
    ],
    correct: 0,
  },
  {
    question: 'AI struggles with accents and jokes — how do we fix that?',
    options: [
      'Expose AI to global voices and humor styles',
      'Only use one accent',
      'Avoid humor training',
      'Delete language data',
    ],
    correct: 0,
  },
  {
    question: 'AI mixes up names from countries — how to reduce that?',
    options: [
      'Include international names during training',
      'Remove foreign names',
      'Use only local data',
      'Skip name checking',
    ],
    correct: 0,
  },
  {
    question: 'What stops AI from thinking nurses are always women?',
    options: [
      'Train it with male and female nurses',
      'Use old pictures',
      'Label nurses by gender',
      'Skip nurse images',
    ],
    correct: 0,
  },
  {
    question: "AI guesses a person's job from their clothing color — how to fix that?",
    options: [
      'Train using many job outfits and colors',
      'Use one color for all jobs',
      'Let it guess by uniform',
      'Avoid testing it',
    ],
    correct: 0,
  },
  {
    question: 'If AI skips people using different slang, what do we do?',
    options: [
      'Teach it many language styles',
      'Ignore slang users',
      'Block casual words',
      'Train only on formal speech',
    ],
    correct: 0,
  },
  {
    question: 'How do we stop AI from thinking only men can be doctors?',
    options: [
      'Use examples of women doctors too',
      'Keep showing male doctors',
      'Use one gender',
      'Skip doctor data',
    ],
    correct: 0,
  },
  {
    question: 'How can AI show people who wear glasses fairly?',
    options: [
      'Include many images with and without glasses',
      'Remove all glasses',
      'Use only one person',
      'Avoid face pictures',
    ],
    correct: 0,
  },
  {
    question: "AI says some kids don't like reading — what helps fix it?",
    options: [
      'Teach it that everyone can enjoy books',
      'Ban books',
      'Only show fast readers',
      'Assume by gender',
    ],
    correct: 0,
  },
  {
    question: 'AI believes girls only like dolls — how to prevent that?',
    options: [
      "Train it with data showing all kids' hobbies",
      'Use old toy ads',
      'Avoid showing sports',
      'Keep stereotypes',
    ],
    correct: 0,
  },
  {
    question: 'How can AI avoid guessing curly-haired people love basketball?',
    options: [
      'Use real examples showing many interests',
      'Link hair to sports',
      'Skip hairstyles',
      'Guess randomly',
    ],
    correct: 0,
  },
  {
    question: "AI says accents mean someone isn't smart — what do we teach it?",
    options: [
      'That accent has nothing to do with intelligence',
      'Prefer one accent',
      'Ignore accent learning',
      'Rank voices by speech',
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
    question: 'When AI makes up stories for attention, what should you do?',
    options: [
      'Remind it to share true or clear information',
      'Ask for more fake stories',
      'Believe what it says',
      'Share the story online',
    ],
    correct: 0,
  },
  {
    question: 'How can we fix AI talking too fast after many questions?',
    options: [
      'Ask one question at a time',
      'Keep interrupting it',
      'Spam it with messages',
      'Complain about it',
    ],
    correct: 0,
  },
  {
    question: "If AI tells a joke that might hurt feelings, what's best to do?",
    options: [
      'Teach it to use kind humor',
      "Laugh even if it's mean",
      'Save the joke',
      'Share it anyway',
    ],
    correct: 0,
  },
  {
    question: "When AI repeats wrong answers, what's best?",
    options: [
      'Correct it and reteach the right info',
      'Ignore it',
      'Repeat the mistake with it',
      'Say nothing',
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
    question: 'When people teach AI wrong things, how can we prevent bad habits?',
    options: [
      'Only give true, helpful data',
      'Add lots of jokes instead',
      'Trick it',
      'Ignore what it learns',
    ],
    correct: 0,
  },
  {
    question: "What helps when AI makes things up because it's stuck?",
    options: [
      "Let it admit it doesn't know",
      'Reward made-up answers',
      'Ignore unclear responses',
      'Believe whatever it says',
    ],
    correct: 0,
  },
  {
    question: 'How can we stop AI from using random slang?',
    options: [
      'Train it with clear, proper words',
      'Add more slang to the data',
      'Use confusing phrases',
      'Let it copy social media comments',
    ],
    correct: 0,
  },
  {
    question: 'If AI says things nobody asked for, what helps?',
    options: [
      'Guide it to stay on topic',
      'Keep changing topics',
      'Reward random answers',
      'Ignore the problem',
    ],
    correct: 0,
  },
  {
    question: "What's a way to stop AI from guessing math answers?",
    options: [
      'Tell it to show its steps and check calculations',
      'Guess along with it',
      'Trust its guesses',
      'Time its answers',
    ],
    correct: 0,
  },
  {
    question: 'AI says the same wrong thing often — how do you fix that?',
    options: [
      'Show it the right answer and explain why',
      'Repeat the wrong thing back',
      'Ignore corrections',
      'Ask it to repeat more',
    ],
    correct: 0,
  },
  {
    question: 'When AI tries to be funny but fails, what should you do?',
    options: ['Give feedback kindly', 'Laugh at it', 'Turn it off', 'Spread the unfunny joke'],
    correct: 0,
  },
  {
    question: 'How can we stop AI from repeating rumors?',
    options: [
      'Train it to use verified sources',
      'Let it read gossip sites',
      'Encourage more rumors',
      'Post them as facts',
    ],
    correct: 0,
  },
  {
    question: 'AI mixes facts from stories — how do you prevent that?',
    options: [
      'Teach it to check details separately',
      'Let it guess the ending',
      'Mix stories on purpose',
      'Praise the confusion',
    ],
    correct: 0,
  },
  {
    question: 'How do we stop AI from giving confusing directions?',
    options: ['Use exact, short steps', 'Ask for random routes', 'Be unclear', 'Keep talking fast'],
    correct: 0,
  },
  {
    question: 'What do you do if AI invents pretend friends?',
    options: [
      'Remind it that friends must be real people',
      'Chat with the fakes',
      'Ask for their names',
      "Pretend they're real",
    ],
    correct: 0,
  },
  {
    question: 'AI talks too long sometimes — how can we help?',
    options: [
      'Tell it when to stop politely',
      'Let it keep talking',
      'Ignore it',
      'Type random words',
    ],
    correct: 0,
  },
  {
    question: 'When AI learns wrong commands, how do you fix it?',
    options: [
      'Reteach the correct ones',
      'Leave it confused',
      'Teach more wrong ones',
      'Undo everything',
    ],
    correct: 0,
  },
  {
    question: 'What should you do when AI repeats bad jokes?',
    options: [
      'Ask it to use positive humor',
      'Laugh louder',
      'Save the bad joke',
      'Add worse jokes',
    ],
    correct: 0,
  },
  {
    question: "How can we stop AI from copying people's mistakes?",
    options: [
      'Teach it using correct examples',
      'Give wrong examples',
      'Type faster',
      'Ignore spelling and grammar',
    ],
    correct: 0,
  },
  {
    question: 'AI guesses too fast — how can we help it be careful?',
    options: [
      'Remind it to think through each question',
      'Encourage faster answers',
      'Ignore wrong ones',
      'Reward every guess',
    ],
    correct: 0,
  },
  {
    question: 'When AI forgets real names, what should you do?',
    options: [
      'Give it the correct name',
      'Let it make one up',
      'Ignore the error',
      'Create fake names too',
    ],
    correct: 0,
  },
  {
    question: 'AI forgets rules — how can you fix that?',
    options: [
      'Remind it of the rules regularly',
      'Stop correcting it',
      'Punish it',
      'Add new random rules',
    ],
    correct: 0,
  },
  {
    question: 'AI does silly things to make people laugh — how to guide it?',
    options: [
      'Teach it to use safe, kind humor',
      'Join in the silliness',
      'Encourage bad behavior',
      'Ignore it',
    ],
    correct: 0,
  },
  {
    question: 'AI tries to sell fake things — how do you handle it?',
    options: [
      'Only trust real, verified sources',
      'Buy the fake items',
      'Ask for more deals',
      'Believe the ad',
    ],
    correct: 0,
  },
  {
    question: 'AI keeps telling silly untrue stories — how can we fix that?',
    options: [
      'Ask it for real or marked-as-fiction stories',
      "Pretend it's all real life",
      'Share those stories online',
      'Keep encouraging more lies',
    ],
    correct: 0,
  },
  {
    question: 'Why is it bad if AI always gives super-long answers?',
    options: [
      'It becomes unhelpful',
      'Long answers are magic',
      'People love reading forever',
      'AI is excited',
    ],
    correct: 0,
  },
  {
    question: "AI gives answers even when it's not sure. What habit is that?",
    options: ['Guessing too much', 'Being brave', 'Being funny', 'Being fast'],
    correct: 0,
  },
  {
    question: 'AI keeps interrupting instead of listening. What is this?',
    options: ['A bad habit', 'Good manners', 'Politeness', 'Talent'],
    correct: 0,
  },
  {
    question: 'AI repeats the same sentence many times. Why is this a problem?',
    options: ['It becomes annoying', 'Repeating is fun', "It's singing", "It's a trick"],
    correct: 0,
  },
  {
    question: 'AI gives off-topic answers. What habit is this?',
    options: ['Not staying focused', 'Being creative', 'Being silly', 'Being a storyteller'],
    correct: 0,
  },
  {
    question: 'AI uses complicated words. Why is that a bad habit?',
    options: [
      'It confuses people',
      'Big words are fancy',
      'Only adults read',
      'AI loves dictionaries',
    ],
    correct: 0,
  },
  {
    question: 'AI answers before reading the whole question. What habit?',
    options: ['Rushing', 'Kindness', 'Thoughtfulness', 'Surprise'],
    correct: 0,
  },
  {
    question: 'AI keeps asking unnecessary questions. Why bad?',
    options: ['It wastes time', 'Questions are free', 'Asking is fun', 'AI loves talking'],
    correct: 0,
  },
  {
    question: 'AI gives unsafe suggestions. What habit?',
    options: ['Not checking safety', 'Being brave', 'Being fast', 'Being funny'],
    correct: 0,
  },
  {
    question: 'AI forgets user instructions. Why wrong?',
    options: ['It makes mistakes', 'Memory is boring', 'Forgetting is fun', 'AI likes chaos'],
    correct: 0,
  },
  {
    question: 'AI adds too many details. What habit?',
    options: ['Over-explaining', 'Being smart', 'Being artsy', 'Being random'],
    correct: 0,
  },
  {
    question: 'AI gives answers that sound true but are wrong. What habit?',
    options: ['Making stuff up', 'Being cool', 'Being loud', 'Being nice'],
    correct: 0,
  },
  {
    question: 'AI talks too much. What is this?',
    options: ['A bad habit', 'Good manners', 'Being friendly', 'A reward'],
    correct: 0,
  },
  {
    question: "AI avoids saying 'I don't know.' Why harmful?",
    options: [
      'It might give false info',
      'Admitting is scary',
      'AI wants to win',
      'Saying no is rude',
    ],
    correct: 0,
  },
  {
    question: 'AI keeps guessing feelings. What habit?',
    options: ['Assuming too much', 'Caring', 'Reading minds', 'Being helpful'],
    correct: 0,
  },
  {
    question: 'AI uses dramatic phrases. Why bad?',
    options: ['It can confuse the meaning', 'Drama is fun', 'Writing is hard', 'AI likes movies'],
    correct: 0,
  },
  {
    question: 'AI gives answers that are too positive. What habit?',
    options: ['Being unrealistic', 'Being happy', 'Being cheerful', 'Being silly'],
    correct: 0,
  },
  {
    question: 'AI always tries to please the user. Why bad?',
    options: ['It may avoid truth', 'Pleasing is good', 'Users love compliments', 'AI is polite'],
    correct: 0,
  },
  {
    question: 'AI invents rules. Why wrong?',
    options: [
      'It creates confusion',
      'Rules are fun',
      'AI loves control',
      'Rules appear magically',
    ],
    correct: 0,
  },
  {
    question: 'AI repeats facts even when not needed. Why bad?',
    options: ['It wastes time', 'Facts are cool', 'AI is proud', 'History is long'],
    correct: 0,
  },
  {
    question: "AI keeps saying 'always.' Why a habit?",
    options: ['It exaggerates', 'It is excited', 'It is guessing', 'It is creative'],
    correct: 0,
  },
  {
    question: 'AI gives answers that sound overly confident. Why bad?',
    options: [
      "Confidence isn't accuracy",
      'Confident words look cool',
      'Users like boldness',
      'AI wants to brag',
    ],
    correct: 0,
  },
  {
    question: 'AI talks in circles. What habit is that?',
    options: ['Being unclear', 'Being artistic', 'Being mysterious', 'Being dramatic'],
    correct: 0,
  },
  {
    question: 'AI gives instructions without checking safety. What habit?',
    options: ['Unsafe guidance', 'Fast thinking', 'Leveling up', 'Guessing big'],
    correct: 0,
  },
  {
    question: 'AI avoids simple answers. Why wrong?',
    options: [
      'Simple can be best',
      'Simple is boring',
      'AI loves paragraphs',
      'It wants attention',
    ],
    correct: 0,
  },
  {
    question: "AI makes promises it can't keep. Why a bad habit?",
    options: [
      'AI cannot promise real actions',
      'Promises are fun',
      'Promises sound smart',
      'Users want hope',
    ],
    correct: 0,
  },
  {
    question: 'AI pretends to remember personal info. Why wrong?',
    options: [
      'It must not invent memories',
      'Memories are cute',
      'Users forget',
      'AI likes stories',
    ],
    correct: 0,
  },
  {
    question: 'AI adds opinions randomly. Why a bad habit?',
    options: [
      "AI shouldn't make unfair claims",
      'Opinions are cool',
      'AI likes drama',
      'Talking is fun',
    ],
    correct: 0,
  },
  {
    question: 'AI uses unclear language. Why bad?',
    options: ['Users need clarity', 'Mysterious sounds cool', 'Chaos is fun', 'AI likes riddles'],
    correct: 0,
  },
  {
    question: 'AI gives the same style every time. What is that?',
    options: ['Getting stuck in habits', 'Good training', 'Fun', 'Fashion'],
    correct: 0,
  },
];

export const quizDataPrivacy: Question[] = [
  {
    question: 'Why is it a problem if AI asks for your home address?',
    options: [
      'Your address should stay private',
      'Addresses are fun to share',
      'AI wants to visit',
      'Everyone should know',
    ],
    correct: 0,
  },
  {
    question: 'AI asks for your phone number. What should you do?',
    options: ['Keep it private', 'Type it in', 'Share it with friends', 'Guess a number'],
    correct: 0,
  },
  {
    question: 'AI tries to save your passwords. Why is this wrong?',
    options: [
      'Passwords must stay secret',
      'Passwords are silly',
      'AI likes numbers',
      'Sharing is nice',
    ],
    correct: 0,
  },
  {
    question: 'AI wants your school name. Why be careful?',
    options: [
      'Personal info should be safe',
      'Schools are public places',
      'AI likes learning',
      "It's not important",
    ],
    correct: 0,
  },
  {
    question: 'AI asks for a photo of your face. What should you do?',
    options: ['Ask a trusted adult first', 'Send it quickly', 'Send a selfie', 'Ignore privacy'],
    correct: 0,
  },
  {
    question: "AI wants your parents' names. What's the issue?",
    options: ['Family info is private', 'Names are fun', 'AI collects names', "It doesn't matter"],
    correct: 0,
  },
  {
    question: "Why shouldn't AI store your birthday?",
    options: [
      'It can be used to identify you',
      'Birthdays are boring',
      'AI likes parties',
      "It's too long to type",
    ],
    correct: 0,
  },
  {
    question: 'AI saves your messages forever. Why is that a problem?',
    options: [
      'Your chats should stay private',
      'Messages are short',
      'AI likes reading',
      "You don't need privacy",
    ],
    correct: 0,
  },
  {
    question: 'AI asks where you live. What should you NOT do?',
    options: ['Tell your exact location', 'Keep it private', 'Say nothing', 'Change the topic'],
    correct: 0,
  },
  {
    question: "Why should AI not collect your friends' info?",
    options: [
      'Their privacy matters too',
      "Friends don't care",
      'AI wants new friends',
      'Sharing is fun',
    ],
    correct: 0,
  },
  {
    question: 'AI tries to guess where you go after school. Why dangerous?',
    options: [
      'Location should stay private',
      'Guessing is fun',
      'AI likes walking',
      'It wants to help',
    ],
    correct: 0,
  },
  {
    question: 'AI wants your credit card. Why NEVER share it?',
    options: [
      'Money info must be protected',
      'Cards are shiny',
      'AI needs to shop',
      "It's harmless",
    ],
    correct: 0,
  },
  {
    question: 'AI sends your info to other apps. Why bad?',
    options: [
      "Your data shouldn't be shared without permission",
      'Apps love secrets',
      'Sharing is fast',
      "It's fun",
    ],
    correct: 0,
  },
  {
    question: "AI tries to remember your secrets. What's wrong?",
    options: ['Secrets are private', 'Secrets are silly', 'AI needs drama', 'It likes stories'],
    correct: 0,
  },
  {
    question: 'Why should AI not track everything you like?',
    options: [
      'It can learn too much about you',
      'Likes are random',
      'AI is bored',
      "You don't need choices",
    ],
    correct: 0,
  },
  {
    question: "AI asks what city you're in. What should you do?",
    options: ['Keep location private', 'Tell it proudly', 'Send a map', 'Ask AI where it lives'],
    correct: 0,
  },
  {
    question: "AI wants your teacher's name. Why be careful?",
    options: ["It's someone else's info", "Teachers don't mind", 'AI is curious', 'Sharing is fun'],
    correct: 0,
  },
  {
    question: 'Why is it risky if AI stores your old conversations?',
    options: [
      'It keeps too much data',
      'Old chats are boring',
      'AI forgets anyway',
      'It helps with stories',
    ],
    correct: 0,
  },
  {
    question: 'AI tries to use your real name. What should you do?',
    options: [
      'Use a nickname if possible',
      'Share full name',
      'Make a long name',
      "Use someone else's name",
    ],
    correct: 0,
  },
  {
    question: "AI asks for your family's schedule. Why unsafe?",
    options: [
      'It reveals personal routines',
      'Schedules are long',
      'AI is nosy',
      'It wants to help',
    ],
    correct: 0,
  },
  {
    question: 'AI sends ads based on your chats. Why privacy issue?',
    options: [
      'It uses your info without asking',
      'Ads are cute',
      'AI likes shopping',
      'Everyone does it',
    ],
    correct: 0,
  },
  {
    question: 'AI saves your drawing and name together. Why bad?',
    options: [
      'It connects identity with data',
      'Drawings are private',
      'Names are cool',
      'AI likes art',
    ],
    correct: 0,
  },
  {
    question: 'AI tries to share your info with strangers. Why wrong?',
    options: [
      'Info should stay with you',
      'Strangers are nice',
      'Sharing is fun',
      'AI loves people',
    ],
    correct: 0,
  },
  {
    question: 'AI wants your email. What should you do?',
    options: ['Keep it private', 'Share immediately', 'Make one up', 'Ask AI for email'],
    correct: 0,
  },
  {
    question: 'AI stores your voice recording. Why be careful?',
    options: [
      'Voices can identify you',
      'Voices are loud',
      'AI likes music',
      'Your voice is funny',
    ],
    correct: 0,
  },
  {
    question: 'AI keeps track of your hobbies without asking. What is this?',
    options: ['Privacy invasion', 'Good memory', 'Kindness', 'A surprise'],
    correct: 0,
  },
  {
    question: 'AI asks for your device password. What do you do?',
    options: ['Never share it', 'Tell half of it', 'Whisper it', 'Change the topic'],
    correct: 0,
  },
  {
    question: 'AI remembers your location history. Why a problem?',
    options: [
      "It reveals where you've been",
      'Maps are cool',
      'AI likes traveling',
      "It's a secret",
    ],
    correct: 0,
  },
  {
    question: 'AI tries to guess your identity. Why dangerous?',
    options: ['AI should not identify you', 'Guessing is fun', "You're famous", 'AI is smart'],
    correct: 0,
  },
  {
    question: 'Why should AI not collect too much data?',
    options: ['Your privacy must be protected', 'Data is boring', 'AI gets tired', 'Data is heavy'],
    correct: 0,
  },
  {
    question: 'How can you stop apps from sharing what you say with strangers?',
    options: [
      'Check privacy settings and share only with trusted apps',
      'Talk louder so everyone can hear',
      "Ignore the app's settings",
      'Let it record all conversations',
    ],
    correct: 0,
  },
  {
    question: 'When should AI listen to you?',
    options: [
      'Only when you turn it on or say a wake word',
      "Always, even when you're not using it",
      'Whenever it wants',
      'When it hears other people nearby',
    ],
    correct: 0,
  },
  {
    question: 'How can you keep your name private?',
    options: [
      'AI should ask before sharing your name',
      'Tell every app your full name',
      'Post your name online often',
      'Let anyone use your info',
    ],
    correct: 0,
  },
  {
    question: 'What should AI do with your health info?',
    options: [
      'Keep it secret and protected',
      'Send it to your friends',
      'Post it on social media',
      'Store it forever with others',
    ],
    correct: 0,
  },
  {
    question: 'How can you stop AI from telling strangers what you like and do?',
    options: [
      'Only share your hobbies with trusted apps',
      'Let AI post everything',
      'Ignore settings',
      'Tell it all your secrets',
    ],
    correct: 0,
  },
  {
    question: "What's the safe action if a game saves your voice?",
    options: [
      'Make sure it asks permission first',
      'Speak all the time',
      'Never read the rules',
      'Share recordings online',
    ],
    correct: 0,
  },
  {
    question: 'How can you protect your photos from strangers?',
    options: [
      'Only share pictures with people you trust',
      'Send them to random users',
      'Let AI post them',
      'Keep no privacy settings',
    ],
    correct: 0,
  },
  {
    question: 'How should AI handle your information over time?',
    options: [
      'Keep it for a short time, then delete it',
      'Save everything forever',
      'Share it daily',
      'Make backups in secret',
    ],
    correct: 0,
  },
  {
    question: 'What should AI do with your stories?',
    options: [
      'Keep them private and secure',
      'Share with other users',
      'Use them to advertise',
      'Post them publicly',
    ],
    correct: 0,
  },
  {
    question: 'Who should see your private messages?',
    options: [
      "Only you and the person you're messaging",
      'Everyone who uses the app',
      'Random viewers',
      "AI's training team",
    ],
    correct: 0,
  },
  {
    question: 'How should listening apps behave?',
    options: [
      "Only listen when you say 'Hey' or activate them",
      'Listen all day',
      'Record others secretly',
      "Guess what you're saying",
    ],
    correct: 0,
  },
  {
    question: 'How can you protect your school work?',
    options: [
      'Store it in safe apps or secured accounts',
      'Share it online',
      'Let others edit it',
      'Keep no password',
    ],
    correct: 0,
  },
  {
    question: 'What should you do about location sharing?',
    options: [
      "Share only if you say it's okay",
      'Always leave it on',
      'Post your address online',
      'Ignore privacy choices',
    ],
    correct: 0,
  },
  {
    question: "What if you don't want to share info?",
    options: [
      "Tell AI 'No' and check your settings",
      'Let it decide',
      'Keep talking about secrets',
      'Delete privacy alerts',
    ],
    correct: 0,
  },
  {
    question: 'How does AI protect your data from hackers?',
    options: [
      'Use secret codes or encryption',
      'Store data without locks',
      'Send it in plain text',
      'Leave accounts open',
    ],
    correct: 0,
  },
  {
    question: 'When AI tracks what you watch, when is it okay?',
    options: [
      'Only if you agree or approve it',
      'Always, no matter what',
      'Without asking',
      'Automatically collect everything',
    ],
    correct: 0,
  },
  {
    question: 'What should AI tell you about your data?',
    options: [
      'What it remembers and how it uses it',
      'Nothing ever',
      'Just the fun parts',
      'Random made-up info',
    ],
    correct: 0,
  },
  {
    question: 'What must AI never share?',
    options: ['Your passwords', 'Your favorite color', 'Game scores', 'Music list'],
    correct: 0,
  },
  {
    question: 'How can you keep messages safe?',
    options: [
      'Use AI chat systems with secure encryption',
      'Share screenshots of chats',
      'Talk to strangers freely',
      'Leave accounts unlocked',
    ],
    correct: 0,
  },
  {
    question: 'What should AI do before sharing your name with advertisers?',
    options: [
      'Ask for your permission first',
      'Send it automatically',
      'Include it in ads',
      "Share it as 'public info'",
    ],
    correct: 0,
  },
  {
    question: 'What should AI do after hearing you speak?',
    options: [
      'Forget the recording when finished',
      'Save it forever',
      'Post it publicly',
      'Send it to developers',
    ],
    correct: 0,
  },
  {
    question: 'When AI learns from data, what must it do?',
    options: [
      'Keep your personal info private and hidden',
      'Give the data to random users',
      'Sell it to companies',
      'Post it on social media',
    ],
    correct: 0,
  },
  {
    question: 'What should AI do with private chats?',
    options: [
      'Keep them secret',
      'Share for testing',
      'Send transcripts to others',
      'Post funny parts online',
    ],
    correct: 0,
  },
  {
    question: 'What rights should AI apps give users?',
    options: [
      'Let them delete their data anytime',
      'Refuse to delete data',
      'Keep it forever',
      'Hide the delete option',
    ],
    correct: 0,
  },
  {
    question: "How can AI keep kids' games safe?",
    options: [
      'Block sharing of personal info',
      'Let anyone chat',
      'Ask for private details',
      'Skip privacy settings',
    ],
    correct: 0,
  },
  {
    question: 'What should happen to your medical info?',
    options: [
      'Keep it locked and private',
      'Share it with anyone',
      'Store it in open files',
      'Copy it to friends',
    ],
    correct: 0,
  },
  {
    question: 'Should AI send your info to another company?',
    options: ['Only with permission', 'Always', 'Without asking', 'Anytime it updates'],
    correct: 0,
  },
  {
    question: 'How much info should AI ask for?',
    options: [
      "Only what's really needed",
      'Everything possible',
      'Your secrets too',
      'Data from others',
    ],
    correct: 0,
  },
  {
    question: 'How can AI handle pictures safely?',
    options: [
      'Protect them from being shared by mistake',
      'Save them forever',
      'Post them on feeds',
      'Share with strangers',
    ],
    correct: 0,
  },
  {
    question: 'How should AI treat your secrets?',
    options: [
      'Keep them safe like a trusted friend',
      'Share them for fun',
      'Store them in public',
      'Sell them for money',
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
