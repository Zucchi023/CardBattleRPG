window.CBR = window.CBR || {};

CBR.app = {
  current: null,

  init() {
    CBR.save.load();
    this.root = document.getElementById('app');
    this.show('home');
  },

  show(name, params) {
    const prev = this.current && CBR.screens[this.current];
    if (prev && prev.unmount) prev.unmount();
    CBR.ui.closeSheet();
    this.current = name;
    this.root.onclick = null;
    this.root.scrollTop = 0;
    CBR.screens[name].mount(this.root, params || {});
  },

  // バトル結果をセーブデータに反映してリザルト画面へ
  finishBattle(stageIndex, battle) {
    const save = CBR.save;
    const stage = CBR.STAGES[stageIndex];
    const win = battle.winner === 0;
    const gains = [];
    const results = battle.playerExpResults();
    for (const uid of Object.keys(results)) {
      const m = save.findMonster(uid);
      if (!m) continue;
      const before = m.level;
      const ups = CBR.monster.gainExp(m, results[uid].total);
      gains.push({ m, before, gained: results[uid].total, ups });
    }
    let reward = null;
    if (win && !save.isCleared(stage.id)) {
      save.data.clearedStages.push(stage.id);
      reward = CBR.monster.create(CBR.util.pick(stage.rewards));
      save.data.monsters.push(reward);
    }
    save.write();
    this.show('result', { win, stageIndex, gains, reward, ko: battle.players[0].ko });
  },
};

document.addEventListener('DOMContentLoaded', () => CBR.app.init());
