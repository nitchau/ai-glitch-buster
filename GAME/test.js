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
