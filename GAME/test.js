// GAME/test.js — In-browser test runner for state.js
(function() {
  var results = [];

  function test(name, fn) {
    try {
      GG.state.reset();
      fn();
      results.push({ name: name, pass: true });
    } catch (e) {
      results.push({ name: name, pass: false, error: e.message });
    }
  }

  function assertEq(actual, expected, msg) {
    var a = JSON.stringify(actual);
    var e = JSON.stringify(expected);
    if (a !== e) {
      throw new Error((msg || 'assertEq') + ': expected ' + e + ', got ' + a);
    }
  }
  function assertTrue(cond, msg)  { if (!cond) throw new Error(msg || 'expected truthy'); }
  function assertFalse(cond, msg) { if (cond) throw new Error(msg || 'expected falsy'); }
  function assertNull(val, msg)   { if (val !== null) throw new Error((msg || 'assertNull') + ': got ' + JSON.stringify(val)); }

  test('load() returns null on fresh storage', function() {
    assertNull(GG.state.load());
  });

  test('save() then load() round-trips a profile', function() {
    var p = GG.state.newProfile('Mishika', 'guardian');
    var r = GG.state.save(p);
    assertTrue(r.ok, 'save should succeed');
    var loaded = GG.state.load();
    assertEq(loaded.name, 'Mishika');
    assertEq(loaded.gradeBand, 'guardian');
    assertEq(loaded.progress['bias-breaker'].unlocked, true);
  });

  test('load() returns null on corrupted JSON', function() {
    localStorage.setItem('gg.profile', 'not-valid-json-{');
    assertNull(GG.state.load());
  });

  test('load() returns null on missing fields', function() {
    localStorage.setItem('gg.profile', JSON.stringify({ name: 'X' })); // missing gradeBand, progress
    assertNull(GG.state.load());
  });

  test("isIslandUnlocked('bias-breaker') returns true for a fresh profile", function() {
    GG.state.save(GG.state.newProfile('Mishika', 'guardian'));
    assertTrue(GG.state.isIslandUnlocked('bias-breaker'));
  });

  test("isIslandUnlocked('habit-harbor') returns false for a fresh profile", function() {
    GG.state.save(GG.state.newProfile('Mishika', 'guardian'));
    assertFalse(GG.state.isIslandUnlocked('habit-harbor'));
  });

  test('reset() clears the profile', function() {
    GG.state.save(GG.state.newProfile('Mishika', 'guardian'));
    GG.state.reset();
    assertNull(GG.state.load());
  });

  test('markIslandCleared sets cleared=true and stars=N', function() {
    GG.state.save(GG.state.newProfile('Mishika', 'guardian'));
    var r = GG.state.markIslandCleared('bias-breaker', 2);
    assertTrue(r.ok, 'markIslandCleared should return ok');
    var p = GG.state.load();
    assertEq(p.progress['bias-breaker'].cleared, true);
    assertEq(p.progress['bias-breaker'].stars, 2);
  });

  test('markIslandCleared keeps best-of stars', function() {
    GG.state.save(GG.state.newProfile('Mishika', 'guardian'));
    GG.state.markIslandCleared('bias-breaker', 2);
    GG.state.markIslandCleared('bias-breaker', 3);
    GG.state.markIslandCleared('bias-breaker', 1);
    var p = GG.state.load();
    assertEq(p.progress['bias-breaker'].stars, 3, 'should not regress stars');
  });

  test('markIslandCleared unlocks the next island in canonical order', function() {
    GG.state.save(GG.state.newProfile('Mishika', 'guardian'));
    GG.state.markIslandCleared('bias-breaker', 1);
    var p = GG.state.load();
    assertEq(p.progress['habit-harbor'].unlocked, true);
  });

  test("markIslandCleared('the-core', 3) does NOT crash (no next island)", function() {
    var profile = GG.state.newProfile('Mishika', 'guardian');
    profile.progress['the-core'].unlocked = true;
    GG.state.save(profile);
    var r = GG.state.markIslandCleared('the-core', 3);
    assertTrue(r.ok);
    var p = GG.state.load();
    assertEq(p.progress['the-core'].cleared, true);
    assertEq(p.progress['the-core'].stars, 3);
  });

  test('biasBreakerQuestions.pickN(5) returns 5 well-formed questions', function() {
    var qs = GG.biasBreakerQuestions.pickN(5);
    assertEq(qs.length, 5);
    qs.forEach(function(q, i) {
      assertTrue(!!q.question, 'q[' + i + '] missing question');
      assertEq(q.options.length, 4, 'q[' + i + '] should have 4 options');
      assertTrue(typeof q.correct === 'number' && q.correct >= 0 && q.correct < 4,
                 'q[' + i + '].correct should be a 0-3 index');
      q.options.forEach(function(opt, j) {
        assertTrue(typeof opt === 'string' && opt.length > 0,
                   'q[' + i + '].option[' + j + '] should be a non-empty string');
      });
    });
  });

  test('biasBreakerQuestions.size() returns positive count', function() {
    assertTrue(GG.biasBreakerQuestions.size() > 0, 'pool should not be empty');
  });

  // --- Bad-Habit Harbor (Phase 1) ---

  test('habitHarborQuestions.pickN(5) returns 5 well-formed questions', function() {
    var qs = GG.habitHarborQuestions.pickN(5);
    assertEq(qs.length, 5);
    qs.forEach(function(q, i) {
      assertTrue(!!q.question, 'q[' + i + '] missing question');
      assertEq(q.options.length, 4, 'q[' + i + '] should have 4 options');
      assertTrue(typeof q.correct === 'number' && q.correct >= 0 && q.correct < 4,
                 'q[' + i + '].correct should be a 0-3 index');
      q.options.forEach(function(opt, j) {
        assertTrue(typeof opt === 'string' && opt.length > 0,
                   'q[' + i + '].option[' + j + '] should be a non-empty string');
      });
    });
  });

  test('habitHarborQuestions.size() returns positive count', function() {
    assertTrue(GG.habitHarborQuestions.size() > 0, 'pool should not be empty');
  });

  test('habitHarborMaze is solvable (all 5 bots + exit reachable)', function() {
    var model = GG.habitHarborMaze.build();
    assertTrue(GG.habitHarborMaze.validateSolvable(model), 'maze should be solvable');
  });

  test('habitHarborMaze has 5 bots, 5 gates, 1 spawn, 1 exit', function() {
    var model = GG.habitHarborMaze.build();
    assertEq(model.bots.length, 5);
    assertEq(model.gates.length, 5);
    assertTrue(!!model.spawn, 'should have a spawn');
    assertTrue(!!model.exit, 'should have an exit');
  });

  // --- Bad-Habit Harbor (Phase 2: movement collision) ---

  test('habitHarborMaze.isWall: border is wall, spawn is open', function() {
    var m = GG.habitHarborMaze.build();
    assertTrue(GG.habitHarborMaze.isWall(m, 0, 0, {}), 'border should be wall');
    assertFalse(GG.habitHarborMaze.isWall(m, m.spawn.c, m.spawn.r, {}), 'spawn should be open');
  });

  test('habitHarborMaze.isWall: a gate blocks when closed, passes when opened', function() {
    var m = GG.habitHarborMaze.build();
    var g = m.gates[0];
    assertTrue(GG.habitHarborMaze.isWall(m, g.c, g.r, {}), 'closed gate is wall');
    var open = {}; open[g.id] = true;
    assertFalse(GG.habitHarborMaze.isWall(m, g.c, g.r, open), 'opened gate is passable');
  });

  // --- Bad-Habit Harbor (Phase 3: quiz choices) ---

  test('habitHarborQuestions.toChoices returns 4 choices with exactly one correct', function() {
    var q = GG.habitHarborQuestions.pickN(1)[0];
    var ch = GG.habitHarborQuestions.toChoices(q);
    assertEq(ch.length, 4);
    var n = 0;
    ch.forEach(function(c) { if (c.isCorrect) n++; });
    assertEq(n, 1, 'exactly one correct choice');
  });

  test('habitHarborQuestions.toChoices preserves option texts + correct mapping', function() {
    var q = GG.habitHarborQuestions.pickN(1)[0];
    var ch = GG.habitHarborQuestions.toChoices(q);
    var texts = ch.map(function(c) { return c.text; }).sort();
    var orig = q.options.slice().sort();
    assertEq(texts, orig, 'same set of option texts');
    var correct = ch.filter(function(c) { return c.isCorrect; })[0];
    assertEq(correct.text, q.options[q.correct], 'correct flag on the right text');
  });

  function render() {
    var html = '<h1>Glitch Guardians — Test Runner</h1>';
    var passed = 0;
    html += '<table>';
    html += '<tr><th>Test</th><th>Status</th></tr>';
    results.forEach(function(r) {
      html += '<tr><td>' + r.name + '</td>';
      if (r.pass) { html += '<td style="color:green;">✅ PASS</td></tr>'; passed++; }
      else        { html += '<td style="color:red;">❌ FAIL — ' + r.error + '</td></tr>'; }
    });
    html += '</table>';
    html += '<p style="font-size:1.2em;margin-top:1em;"><strong>' + passed + ' / ' + results.length + ' passed</strong></p>';
    document.getElementById('test-results').innerHTML = html;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
