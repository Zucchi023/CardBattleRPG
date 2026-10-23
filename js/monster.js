window.CBR = window.CBR || {};

// モンスター個体(レベル・経験値・固有ID)に関するルール
CBR.monster = {
  MAX_LEVEL: 20,

  create(speciesId, level = 1) {
    return { uid: CBR.util.uid('m'), speciesId, level, exp: 0 };
  },

  species(m) {
    return CBR.SPECIES[m.speciesId];
  },

  maxHp(m) {
    const s = CBR.SPECIES[m.speciesId];
    return s.hp + s.hpUp * (m.level - 1);
  },

  attackDamage(m, attack) {
    if (!attack.damage) return 0;
    const s = CBR.SPECIES[m.speciesId];
    return attack.damage + s.atkUp * (m.level - 1);
  },

  expToNext(level) {
    return 20 + level * 20;
  },

  // 経験値を加算し、レベルアップ回数を返す
  gainExp(m, amount) {
    let ups = 0;
    m.exp += amount;
    while (m.level < this.MAX_LEVEL && m.exp >= this.expToNext(m.level)) {
      m.exp -= this.expToNext(m.level);
      m.level++;
      ups++;
    }
    if (m.level >= this.MAX_LEVEL) m.exp = 0;
    return ups;
  },

  koExp(defeatedLevel) {
    return 20 + defeatedLevel * 5;
  },

  PARTICIPATION_EXP: { win: 20, lose: 8 },
};
