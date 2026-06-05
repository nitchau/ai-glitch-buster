// GAME/screens/island-intro.js — Per-island story blurb + Coming Soon.
window.GG = window.GG || {};
GG.screens = GG.screens || {};

GG.screens.islandIntro = (function() {
  var ISLAND_META = {
    'bias-breaker': {
      name: 'Bias Breaker',
      topic: 'Fairness in AI',
      blurb: "The city's game-and-sports AI has gone unfair — it blocks some citizens for no good reason. Race across the rooftops, answer fairness questions, and teach the AI that fair systems treat everyone equally.",
      icon: '⚖️'
    },
    'habit-harbor': {
      name: 'Bad-Habit Harbor',
      topic: 'Bad Habits in AI',
      blurb: 'Glitch infected the helper-bots, and they copied bad behavior from the internet. Solve teamwork puzzles in the harbor maze to teach them what kindness, patience, and good instructions actually look like.',
      icon: '🌊'
    },
    'privacy-vaults': {
      name: 'Privacy Vault',
      topic: 'Privacy & Data',
      blurb: "Drones are leaking the city's passwords, messages, and secret files! Sneak past lasers, shut down the leaks, and learn what's safe to share — and what should stay private.",
      icon: '🔐'
    },
    'reality-tower': {
      name: 'Hallucination Tower',
      topic: 'AI Hallucinations',
      blurb: 'The AI is making things up — maps lead into walls, alerts point the wrong way. Climb the shifting tower and spot the fake information to find the safe path up.',
      icon: '🗼'
    },
    'the-core': {
      name: 'The Core',
      topic: 'Final Showdown',
      blurb: "Heal all four islands to unlock Glitch's lair. The Core combines every challenge into one final test — and a face-off with the virus itself.",
      icon: '💥'
    }
  };

  function clearChildren(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function elem(tag, className, textContent) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (textContent != null) e.textContent = textContent;
    return e;
  }

  function buildCard(meta) {
    var card = elem('div', 'gg-card gg-island-intro');

    card.appendChild(elem('div', 'gg-island-intro-icon', meta.icon));
    card.appendChild(elem('h1', 'gg-title', meta.name));
    card.appendChild(elem('p', 'gg-topic', 'Topic: ' + meta.topic));
    card.appendChild(elem('p', 'gg-blurb', meta.blurb));

    var comingSoon = elem('div', 'gg-coming-soon');
    var csTitle = elem('p');
    var strong = elem('strong', null, '🚧 Coming Soon!');
    csTitle.appendChild(strong);
    comingSoon.appendChild(csTitle);
    comingSoon.appendChild(elem('p', 'gg-small',
      'Real gameplay is being built. For now, you can explore the map and see what awaits.'));
    card.appendChild(comingSoon);

    var backBtn = elem('button', 'gg-button gg-secondary', '← Back to Map');
    backBtn.id = 'gg-back-to-map';
    backBtn.type = 'button';
    card.appendChild(backBtn);

    return { card: card, backBtn: backBtn };
  }

  function render(rootEl, islandId, onBack) {
    var meta = ISLAND_META[islandId];
    clearChildren(rootEl);

    if (!meta) {
      var fallback = elem('div', 'gg-card');
      fallback.appendChild(elem('p', null, 'Unknown island: ' + islandId));
      rootEl.appendChild(fallback);
      return;
    }

    var built = buildCard(meta);
    rootEl.appendChild(built.card);
    built.backBtn.addEventListener('click', onBack);
  }

  return { render: render };
})();
