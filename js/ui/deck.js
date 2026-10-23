window.CBR = window.CBR || {};
CBR.screens = CBR.screens || {};

CBR.screens.deck = {
  mount(root) {
    const src = CBR.save.data.deck;
    this.work = { monsterUids: [...src.monsterUids], energy: { ...src.energy } };
    this.filter = 'all';
    this.dirty = false;
    this.root = root;
    this.render();

    root.onclick = e => {
      const el = e.target.closest('[data-act]');
      if (!el || el.disabled) return;
      const { act, arg } = el.dataset;
      const w = this.work;
      if (act === 'back') {
        if (this.dirty && !confirm('変更を保存せずに戻りますか?')) return;
        CBR.app.show('home');
        return;
      }
      if (act === 'save') {
        CBR.save.data.deck = { monsterUids: [...w.monsterUids], energy: { ...w.energy } };
        CBR.save.write();
        this.dirty = false;
        CBR.ui.toast('デッキを保存しました');
        this.render();
        return;
      }
      if (act === 'filter') this.filter = arg;
      if (act === 'toggle') {
        const i = w.monsterUids.indexOf(arg);
        if (i >= 0) w.monsterUids.splice(i, 1); else w.monsterUids.push(arg);
        this.dirty = true;
      }
      if (act === 'eplus') { w.energy[arg] = (w.energy[arg] || 0) + 1; this.dirty = true; }
      if (act === 'eminus' && w.energy[arg] > 0) { w.energy[arg]--; this.dirty = true; }
      if (act === 'info') {
        e.stopPropagation();
        CBR.ui.openSheet(CBR.ui.monsterDetail(CBR.save.findMonster(arg)));
        return;
      }
      this.render();
    };
  },

  render() {
    const w = this.work;
    const count = CBR.save.deckCount(w);
    const inDeck = new Set(w.monsterUids);
    const typeIdx = t => CBR.TYPE_ORDER.indexOf(t);
    const list = [...CBR.save.data.monsters]
      .filter(m => this.filter === 'all' || (this.filter === 'in') === inDeck.has(m.uid))
      .sort((a, b) => {
        const sa = CBR.SPECIES[a.speciesId], sb = CBR.SPECIES[b.speciesId];
        return typeIdx(sa.type) - typeIdx(sb.type) || sa.hp - sb.hp || a.speciesId.localeCompare(b.speciesId) || b.level - a.level;
      });

    const energyRows = CBR.TYPE_ORDER.map(t => `<div class="erow">
      ${CBR.ui.energyIcon(t)}<span>${CBR.TYPES[t].name}エネルギー</span>
      <button class="step" data-act="eminus" data-arg="${t}" ${w.energy[t] ? '' : 'disabled'}>−</button>
      <b class="enum">${w.energy[t] || 0}</b>
      <button class="step" data-act="eplus" data-arg="${t}">＋</button>
    </div>`).join('');

    const tiles = list.map(m => `<div class="tile-wrap" data-act="toggle" data-arg="${m.uid}">
      ${CBR.ui.monsterTile(m, inDeck.has(m.uid) ? 'in-deck' : '')}
      <button class="tile-info" data-act="info" data-arg="${m.uid}" aria-label="詳細">i</button>
    </div>`).join('') || '<p class="empty">該当するモンスターがいません</p>';

    const tab = (k, label) => `<button class="tab ${this.filter === k ? 'on' : ''}" data-act="filter" data-arg="${k}">${label}</button>`;
    const monsterCount = w.monsterUids.length;
    const energyCount = count - monsterCount;

    this.root.innerHTML = `<div class="screen deck">
      <header class="topbar">
        <button class="icon-btn" data-act="back" aria-label="戻る">←</button>
        <h1>デッキ編成</h1>
        <span class="count ${count === 40 ? 'ok' : 'ng'}">${count}/40</span>
      </header>
      <div class="deck-scroll">
        <div class="deck-summary">モンスター ${monsterCount} ・ エネルギー ${energyCount}</div>
        <section class="energy-box">${energyRows}</section>
        <div class="tabs">${tab('all', 'すべて')}${tab('in', 'デッキ内')}${tab('out', 'デッキ外')}</div>
        <p class="hint">タップでデッキに出し入れ(✔がデッキ内)</p>
        <div class="tiles">${tiles}</div>
      </div>
      <footer class="bottombar">
        <button class="btn" data-act="save" ${count === 40 && this.dirty ? '' : 'disabled'}>
          ${count === 40 ? (this.dirty ? '保存する' : '保存済み') : `あと${40 - count > 0 ? (40 - count) + '枚追加' : (count - 40) + '枚減らす'}`}
        </button>
      </footer>
    </div>`;
  },
};
