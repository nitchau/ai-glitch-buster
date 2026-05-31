// GAME/screens/habit-harbor-maze.js — Top-down harbor maze data model.
//
// The maze is a fixed, hand-authored grid (no procedural generation). Each
// rescue lifts one gate; the design is a LINEAR CHAIN so a deadlock is
// structurally impossible: bot i lives beyond gate i-1, gate i (opened by
// bot i) guards the way to bot i+1, and the exit lies beyond gate e (bot 5).
//
// Legend:  '#' wall (dock/crate)   '.' water (open)   'S' spawn   'E' exit
//          '1'..'5' bot spawn cells   'a'..'e' gate cells
//          (gate 'a' is opened by bot '1', 'b' by '2', ... 'e' by '5')
//
// validateSolvable() is exercised by GAME/test.js — if a future layout edit
// ever breaks solvability, the test goes red.
window.GG = window.GG || {};

GG.habitHarborMaze = (function() {
  var COLS = 15, ROWS = 9, CELL = 64;   // logical canvas = 960 x 576

  var LAYOUT = [
    "###############",
    "#S..1...a...2.#",
    "#############.#",
    "#..c..3....b..#",
    "#.#############",
    "#...4...d..5.e#",
    "#############.#",
    "#############E#",
    "###############"
  ];

  // Bot id -> gate id mapping, by index (bot '1' opens gate 'a', etc.)
  var BOT_IDS  = ['1', '2', '3', '4', '5'];
  var GATE_IDS = ['a', 'b', 'c', 'd', 'e'];

  function build() {
    var grid = [];
    var spawn = null, exit = null;
    var bots = [], gates = [];
    for (var r = 0; r < LAYOUT.length; r++) {
      var rowStr = LAYOUT[r];
      var rowArr = [];
      for (var c = 0; c < rowStr.length; c++) {
        var ch = rowStr.charAt(c);
        rowArr.push(ch);
        if (ch === 'S') {
          spawn = { c: c, r: r };
        } else if (ch === 'E') {
          exit = { c: c, r: r };
        } else if (BOT_IDS.indexOf(ch) >= 0) {
          bots.push({ id: ch, c: c, r: r, gate: GATE_IDS[BOT_IDS.indexOf(ch)] });
        } else if (GATE_IDS.indexOf(ch) >= 0) {
          gates.push({ id: ch, c: c, r: r, openedBy: BOT_IDS[GATE_IDS.indexOf(ch)] });
        }
      }
      grid.push(rowArr);
    }
    return { grid: grid, spawn: spawn, exit: exit, bots: bots, gates: gates, cols: COLS, rows: ROWS };
  }

  function cellChar(model, c, r) {
    if (r < 0 || r >= model.rows || c < 0 || c >= model.cols) return '#';
    return model.grid[r][c];
  }

  // openGates may be an array of ids or an object map { id: true }.
  function isGateOpen(openGates, id) {
    if (!openGates) return false;
    if (typeof openGates.indexOf === 'function') return openGates.indexOf(id) >= 0;
    return !!openGates[id];
  }

  // A cell blocks movement if it's out of bounds, a wall, or a gate that
  // hasn't been opened yet. Water / spawn / exit / bot cells are passable.
  function isWall(model, c, r, openGates) {
    var ch = cellChar(model, c, r);
    if (ch === '#') return true;
    if (GATE_IDS.indexOf(ch) >= 0) return !isGateOpen(openGates, ch);
    return false;
  }

  // BFS from spawn over passable cells (4-directional, matching boat movement).
  // Returns a set of "c,r" keys that are reachable given the open gates.
  function reachableCells(model, openGates) {
    var seen = {};
    var start = model.spawn;
    if (!start) return seen;
    var queue = [start];
    seen[start.c + ',' + start.r] = true;
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (queue.length) {
      var cur = queue.shift();
      for (var d = 0; d < dirs.length; d++) {
        var nc = cur.c + dirs[d][0];
        var nr = cur.r + dirs[d][1];
        var key = nc + ',' + nr;
        if (seen[key]) continue;
        if (isWall(model, nc, nr, openGates)) continue;
        seen[key] = true;
        queue.push({ c: nc, r: nr });
      }
    }
    return seen;
  }

  // Simulate a full playthrough: repeatedly rescue any reachable un-rescued bot
  // (which opens its gate) until no further progress. Solvable iff every bot
  // gets rescued AND the exit is reachable with the final set of open gates.
  function validateSolvable(model) {
    var open = {};        // gateId -> true
    var rescued = {};     // botId  -> true
    var progressed = true;
    while (progressed) {
      progressed = false;
      var reach = reachableCells(model, open);
      for (var i = 0; i < model.bots.length; i++) {
        var b = model.bots[i];
        if (rescued[b.id]) continue;
        if (reach[b.c + ',' + b.r]) {
          rescued[b.id] = true;
          open[b.gate] = true;
          progressed = true;
        }
      }
    }
    for (var j = 0; j < model.bots.length; j++) {
      if (!rescued[model.bots[j].id]) return false;
    }
    if (!model.exit) return false;
    var finalReach = reachableCells(model, open);
    return !!finalReach[model.exit.c + ',' + model.exit.r];
  }

  return {
    COLS: COLS,
    ROWS: ROWS,
    CELL: CELL,
    LAYOUT: LAYOUT,
    build: build,
    isWall: isWall,
    reachableCells: reachableCells,
    validateSolvable: validateSolvable
  };
})();
