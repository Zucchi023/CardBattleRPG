window.CBR = window.CBR || {};

CBR.save = {
  KEY: 'cbrpg_save_v1',
  DECK_SIZE: 40,
  data: null,

  newGame() {
    const mk = CBR.monster.create.bind(CBR.monster);
    const deckMonsters = [
      ...Array.from({ length: 5 }, () => mk('hinokon')),
      ...Array.from({ length: 3 }, () => mk('kaenbull')),
      ...Array.from({ length: 5 }, () => mk('shizukko')),
      ...Array.from({ length: 3 }, () => mk('aquaseal')),
    ];
    // デッキ外の所持モンスター(デッキ編成のお試し用)
    const spare = [mk('mebuki'), mk('biritch')];
    return {
      version: 1,
      monsters: [...deckMonsters, ...spare],
      deck: {
        monsterUids: deckMonsters.map(m => m.uid),
        energy: { fire: 12, water: 12, thunder: 0, grass: 0 },
      },
      clearedStages: [],
    };
  },

  load() {
    let d = null;
    try {
      const raw = localStorage.getItem(this.KEY);
      if (raw) d = JSON.parse(raw);
    } catch (e) {
      d = null;
    }
    this.data = (d && d.version === 1) ? d : this.newGame();
    this.write();
    return this.data;
  },

  write() {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(this.data));
    } catch (e) {
      // プライベートブラウズ等で保存できなくてもプレイは続行
    }
  },

  reset() {
    this.data = this.newGame();
    this.write();
  },

  findMonster(uid) {
    return this.data.monsters.find(m => m.uid === uid);
  },

  deckCount(deck = this.data.deck) {
    const e = deck.energy;
    return deck.monsterUids.length + CBR.TYPE_ORDER.reduce((n, t) => n + (e[t] || 0), 0);
  },

  isCleared(stageId) {
    return this.data.clearedStages.includes(stageId);
  },

  isUnlocked(index) {
    return index === 0 || this.isCleared(CBR.STAGES[index - 1].id);
  },
};
