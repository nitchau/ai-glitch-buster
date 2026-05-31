// GAME/screens/bias-breaker-avatar.js — Player kid SVG + per-frame animation.
window.GG = window.GG || {};

GG.biasBreakerAvatar = (function() {
  var SVG_NS = 'http://www.w3.org/2000/svg';

  function svgEl(tag, attrs, children) {
    var el = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      for (var k in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
        if (k === 'text') el.textContent = attrs[k];
        else el.setAttribute(k, attrs[k]);
      }
    }
    if (children) for (var i = 0; i < children.length; i++) if (children[i]) el.appendChild(children[i]);
    return el;
  }

  var DEFAULTS = {
    skinTone:  '#fad4ae',
    hairColor: '#d4a449',
    shirtColor:'#43e97b',
    pantsColor:'#3a4d6a',
    shoeColor: '#1a4d7a'
  };

  function build(opts) {
    opts = opts || {};
    for (var k in DEFAULTS) if (!(k in opts)) opts[k] = DEFAULTS[k];

    var refs = {};

    refs.leftLeg = svgEl('path', {
      d: 'M 40 142 L 38 178', stroke: opts.pantsColor, 'stroke-width': 11, 'stroke-linecap': 'round'
    });
    refs.rightLeg = svgEl('path', {
      d: 'M 60 142 L 62 178', stroke: opts.pantsColor, 'stroke-width': 11, 'stroke-linecap': 'round'
    });

    refs.leftShoe  = svgEl('ellipse', { cx: 39, cy: 184, rx: 10, ry: 5, fill: opts.shoeColor });
    refs.rightShoe = svgEl('ellipse', { cx: 61, cy: 184, rx: 10, ry: 5, fill: opts.shoeColor });

    var torso = svgEl('path', {
      d: 'M 26 94 Q 26 88 32 88 L 68 88 Q 74 88 74 94 L 74 144 L 26 144 Z',
      fill: opts.shirtColor
    });

    refs.leftArm  = svgEl('path', { d: 'M 30 95 Q 22 110 22 120', stroke: opts.skinTone, 'stroke-width': 8, fill: 'none', 'stroke-linecap': 'round' });
    refs.rightArm = svgEl('path', { d: 'M 70 95 Q 78 110 78 120', stroke: opts.skinTone, 'stroke-width': 8, fill: 'none', 'stroke-linecap': 'round' });
    refs.leftHand  = svgEl('circle', { cx: 22, cy: 120, r: 6.5, fill: opts.skinTone });
    refs.rightHand = svgEl('circle', { cx: 78, cy: 120, r: 6.5, fill: opts.skinTone });

    var neck  = svgEl('rect',   { x: 44, y: 78, width: 12, height: 14, fill: opts.skinTone });
    var head  = svgEl('circle', { cx: 50, cy: 60, r: 20, fill: opts.skinTone });

    var hair = svgEl('g', null, [
      svgEl('circle', { cx: 34, cy: 44, r: 7, fill: opts.hairColor }),
      svgEl('circle', { cx: 44, cy: 38, r: 8, fill: opts.hairColor }),
      svgEl('circle', { cx: 56, cy: 38, r: 8, fill: opts.hairColor }),
      svgEl('circle', { cx: 66, cy: 44, r: 7, fill: opts.hairColor }),
      svgEl('circle', { cx: 30, cy: 54, r: 5, fill: opts.hairColor }),
      svgEl('circle', { cx: 70, cy: 54, r: 5, fill: opts.hairColor })
    ]);

    var earL = svgEl('ellipse', { cx: 30, cy: 60, rx: 3, ry: 5, fill: opts.skinTone });
    var earR = svgEl('ellipse', { cx: 70, cy: 60, rx: 3, ry: 5, fill: opts.skinTone });

    var eyeL  = svgEl('circle', { cx: 43, cy: 60, r: 2, fill: '#222' });
    var eyeR  = svgEl('circle', { cx: 57, cy: 60, r: 2, fill: '#222' });
    var browL = svgEl('path',   { d: 'M40 54 L46 53', stroke: opts.hairColor, 'stroke-width': 2, 'stroke-linecap': 'round' });
    var browR = svgEl('path',   { d: 'M54 53 L60 54', stroke: opts.hairColor, 'stroke-width': 2, 'stroke-linecap': 'round' });
    var nose  = svgEl('path',   { d: 'M50 64 Q52 68 50 70', stroke: '#b88a5a', 'stroke-width': 1.5, fill: 'none' });
    var mouth = svgEl('path',   { d: 'M44 73 Q50 76 56 73', stroke: '#333', 'stroke-width': 2, fill: 'none', 'stroke-linecap': 'round' });

    var svg = svgEl('svg', { viewBox: '0 0 100 200', 'class': 'gg-bb-avatar', xmlns: SVG_NS }, [
      refs.leftLeg, refs.rightLeg, refs.leftShoe, refs.rightShoe,
      torso,
      refs.leftArm, refs.rightArm, refs.leftHand, refs.rightHand,
      neck, head, hair, earL, earR,
      browL, browR, eyeL, eyeR, nose, mouth
    ]);

    refs.svg = svg;
    return refs;
  }

  function update(refs, state) {
    var flip = state.facing === 'left' ? 'scaleX(-1)' : 'scaleX(1)';
    refs.svg.style.transform = 'translate(' + state.x + 'px,' + state.y + 'px) ' + flip;

    var t = state.animTime;
    if (state.animState === 'running') {
      var legSwing = Math.sin(t * 0.35) * 12;
      var armSwing = Math.sin(t * 0.35 + Math.PI) * 14;
      var FLx = 38 + legSwing, FRx = 62 - legSwing;
      refs.leftLeg.setAttribute('d',  'M 40 142 L ' + FLx + ' 178');
      refs.rightLeg.setAttribute('d', 'M 60 142 L ' + FRx + ' 178');
      refs.leftShoe.setAttribute('cx', FLx + 1);
      refs.rightShoe.setAttribute('cx', FRx - 1);
      var HLy = 120 + armSwing, HRy = 120 - armSwing;
      refs.leftHand.setAttribute('cy', HLy);
      refs.rightHand.setAttribute('cy', HRy);
      refs.leftArm.setAttribute('d',  'M 30 95 Q 22 110 22 ' + HLy);
      refs.rightArm.setAttribute('d', 'M 70 95 Q 78 110 78 ' + HRy);
    } else if (state.animState === 'jumping') {
      refs.leftLeg.setAttribute('d',  'M 40 142 L 36 165');
      refs.rightLeg.setAttribute('d', 'M 60 142 L 64 165');
      refs.leftShoe.setAttribute('cx', 36); refs.leftShoe.setAttribute('cy', 171);
      refs.rightShoe.setAttribute('cx', 64); refs.rightShoe.setAttribute('cy', 171);
      refs.leftHand.setAttribute('cx', 20); refs.leftHand.setAttribute('cy', 70);
      refs.rightHand.setAttribute('cx', 80); refs.rightHand.setAttribute('cy', 70);
      refs.leftArm.setAttribute('d',  'M 30 95 Q 20 82 20 70');
      refs.rightArm.setAttribute('d', 'M 70 95 Q 80 82 80 70');
    } else if (state.animState === 'falling') {
      var w = Math.sin(t * 0.6) * 18;
      refs.leftHand.setAttribute('cx', 22 - w / 2);  refs.leftHand.setAttribute('cy', 110 - w);
      refs.rightHand.setAttribute('cx', 78 + w / 2); refs.rightHand.setAttribute('cy', 110 + w);
      refs.leftArm.setAttribute('d',  'M 30 95 Q 18 100 ' + (22 - w / 2) + ' ' + (110 - w));
      refs.rightArm.setAttribute('d', 'M 70 95 Q 82 100 ' + (78 + w / 2) + ' ' + (110 + w));
      refs.leftLeg.setAttribute('d',  'M 40 142 L 38 178');
      refs.rightLeg.setAttribute('d', 'M 60 142 L 62 178');
      refs.leftShoe.setAttribute('cx', 39); refs.leftShoe.setAttribute('cy', 184);
      refs.rightShoe.setAttribute('cx', 61); refs.rightShoe.setAttribute('cy', 184);
    } else {
      refs.leftLeg.setAttribute('d',  'M 40 142 L 38 178');
      refs.rightLeg.setAttribute('d', 'M 60 142 L 62 178');
      refs.leftShoe.setAttribute('cx', 39); refs.leftShoe.setAttribute('cy', 184);
      refs.rightShoe.setAttribute('cx', 61); refs.rightShoe.setAttribute('cy', 184);
      refs.leftHand.setAttribute('cx', 22); refs.leftHand.setAttribute('cy', 120);
      refs.rightHand.setAttribute('cx', 78); refs.rightHand.setAttribute('cy', 120);
      refs.leftArm.setAttribute('d',  'M 30 95 Q 22 110 22 120');
      refs.rightArm.setAttribute('d', 'M 70 95 Q 78 110 78 120');
    }
  }

  return { build: build, update: update };
})();
