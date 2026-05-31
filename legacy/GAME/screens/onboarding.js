// GAME/screens/onboarding.js — First-time player setup.
window.GG = window.GG || {};
GG.screens = GG.screens || {};

GG.screens.onboarding = (function() {
  function clearChildren(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  // Build the onboarding card using createElement (no innerHTML — every
  // string here is a literal constant, but explicit DOM construction
  // documents that and keeps the security-review hook happy.)
  function buildCard() {
    var card = document.createElement('div');
    card.className = 'gg-card gg-onboarding';

    var title = document.createElement('h1');
    title.className = 'gg-title';
    title.textContent = 'Welcome to Glitch Guardians!';
    card.appendChild(title);

    var subtitle = document.createElement('p');
    subtitle.className = 'gg-subtitle';
    subtitle.textContent = 'The city of Datapolis needs your help to defeat the virus called Glitch.';
    card.appendChild(subtitle);

    var nameLabel = document.createElement('label');
    nameLabel.className = 'gg-label';
    nameLabel.setAttribute('for', 'gg-name-input');
    nameLabel.textContent = "What's your name?";
    card.appendChild(nameLabel);

    var nameInput = document.createElement('input');
    nameInput.id = 'gg-name-input';
    nameInput.className = 'gg-input';
    nameInput.type = 'text';
    nameInput.maxLength = 20;
    nameInput.placeholder = 'Type your name…';
    nameInput.autocomplete = 'off';
    card.appendChild(nameInput);

    var gradeLabel = document.createElement('p');
    gradeLabel.className = 'gg-label';
    gradeLabel.textContent = 'Pick your level:';
    card.appendChild(gradeLabel);

    var radioGroup = document.createElement('div');
    radioGroup.className = 'gg-radio-group';
    radioGroup.appendChild(buildRadio('explorer', 'Explorer', '(K-5)'));
    radioGroup.appendChild(buildRadio('guardian', 'Guardian', '(6-8)'));
    card.appendChild(radioGroup);

    var startBtn = document.createElement('button');
    startBtn.id = 'gg-start-btn';
    startBtn.className = 'gg-button gg-primary';
    startBtn.type = 'button';
    startBtn.disabled = true;
    startBtn.textContent = 'Start Adventure!';
    card.appendChild(startBtn);

    return { card: card, nameInput: nameInput, startBtn: startBtn };
  }

  function buildRadio(value, mainText, smallText) {
    var label = document.createElement('label');
    label.className = 'gg-radio';

    var input = document.createElement('input');
    input.type = 'radio';
    input.name = 'gg-grade';
    input.value = value;
    label.appendChild(input);

    var wrapper = document.createElement('span');

    var strong = document.createElement('strong');
    strong.textContent = mainText;
    wrapper.appendChild(strong);

    wrapper.appendChild(document.createTextNode(' '));

    var small = document.createElement('span');
    small.className = 'gg-small';
    small.textContent = smallText;
    wrapper.appendChild(small);

    label.appendChild(wrapper);
    return label;
  }

  function render(rootEl, onComplete) {
    clearChildren(rootEl);

    var built = buildCard();
    rootEl.appendChild(built.card);

    var card = built.card;
    var nameInput = built.nameInput;
    var startBtn = built.startBtn;
    var gradeInputs = card.querySelectorAll('input[name="gg-grade"]');

    function updateButtonState() {
      var name = nameInput.value.trim();
      var grade = card.querySelector('input[name="gg-grade"]:checked');
      startBtn.disabled = !(name.length >= 1 && grade);
    }

    nameInput.addEventListener('input', updateButtonState);
    Array.prototype.forEach.call(gradeInputs, function(r) {
      r.addEventListener('change', updateButtonState);
    });

    startBtn.addEventListener('click', function() {
      if (startBtn.disabled) return;
      var name = nameInput.value.trim();
      var grade = card.querySelector('input[name="gg-grade"]:checked').value;
      var profile = GG.state.newProfile(name, grade);
      onComplete(profile);
    });

    // Submit on Enter inside name field if button is enabled
    nameInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !startBtn.disabled) {
        e.preventDefault();
        startBtn.click();
      }
    });

    nameInput.focus();
  }

  return { render: render };
})();
