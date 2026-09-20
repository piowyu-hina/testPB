(function (root) {
  'use strict';
  // Data definitions replace Unity ScriptableObjects. Coordinates: +y points up.
  const definitions = {
    short: { name: '短步', offsets: [[0, 1], [1, 0], [0, -1], [-1, 0]], canJump: false, copies: 3 },
    diagonal: { name: '斜步', offsets: [[1, 1], [1, -1], [-1, -1], [-1, 1]], canJump: false, copies: 3 },
    rush: { name: '突進', hint: '不可穿越', offsets: [[0, 2], [2, 0], [0, -2], [-2, 0]], canJump: false, copies: 3 },
    leap: { name: '躍步', hint: '可越過敵人', offsets: [[2, 2], [2, -2], [-2, -2], [-2, 2]], canJump: true, copies: 3 }
  };
  const enemies = {
    imp: { name: '赤角', hint: '直向攻擊', art: 'assets/Imp.png', attacks: [[0, 1], [1, 0], [0, -1], [-1, 0]] },
    bat: { name: '暮翼', hint: '斜向攻擊', art: 'assets/Bat.png', attacks: [[1, 1], [1, -1], [-1, -1], [-1, 1]] }
  };
  const data = { cards: definitions, enemies };
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
  else root.TestPBData = data;
})(typeof globalThis !== 'undefined' ? globalThis : this);
