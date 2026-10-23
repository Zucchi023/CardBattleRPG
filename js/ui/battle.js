window.CBR = window.CBR || {};
CBR.screens = CBR.screens || {};

CBR.screens.battle = {
  AI_DELAY: 750,

  mount(root, { stageIndex }) {
    const save = CBR.save.data;
    const stage = CBR.STAGES[stageIndex];
    this.stageIndex = stageIndex;
    this.stage = stage;
    this.root = root;
    this.busy = false;
    this.alive = true;

    const enemyMonsters = [];
    for (const [id, n] of stage.enemy.monsters) {
      for (let i = 0; i < n; i++) enemyMonsters.push(CBR.monster.create(id, CBR.util.randInt(stage.level[0], stage.level[1])));
    }
    this.b = new CBR.Battle({
      player: {
        name: 'あなた', icon: '🧑',
        monsters: save.deck.monsterUids.map(uid => CBR.save.findMonster(uid)).filter(Boolean),
        energy: save.deck.energy,
      },
      enemy: { name: stage.enemyName, icon: stage.enemyIcon, monsters: enemyMonsters, energy: stage.enemy.energy },
    });

    this.b.dealOpeningHands();
    this.b.setupActive(1, CBR.ai.chooseSetupActive(this.b.players[1].hand));
    this.b.log(`${stage.name}: ${stage.enemyName}との勝負!`);

    root.onclick = e => this.onClick(e);
    this.render();
    this.openSetupSheet();
  },

  unmount() {
    this.alive = false;
    CBR.ui.closeSheet();
  },

  // ---------- 描画 ----------
  render() {
    const b = this.b;
    const me = b.players[0], op = b.players[1];
    const myTurn = b.phase === 'main' && b.current === 0 && !this.busy;
    const ko = n => Array.from({ length: CBR.Battle.KO_TO_WIN }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('');
    const lastLog = b.logs.length ? b.logs[b.logs.length - 1].msg : '';
    let status;
    if (b.phase === 'setup') status = '準備中';
    else if (b.phase === 'over') status = b.winner === 0 ? '勝利!' : '敗北…';
    else if (b.phase === 'promote') status = b.promoting === 0 ? 'バトル場に出すモンスターを選ぶ' : '相手が選択中…';
    else if (b.current === 1) status = '相手のターン';
    else status = b.hasFieldMonster(0) ? 'あなたのターン' : 'モンスターを出そう!';

    this.root.innerHTML = `<div class="screen battle ${myTurn ? 'my-turn' : ''}">
      <div class="pbar opp">
        <span class="who">${op.icon} ${CBR.ui.esc(op.name)}</span>
        <span class="ko" title="KOポイント">${ko(op.ko)}</span>
        <span class="piles">
          <span title="山札">🂠${op.deck.length}</span>
          <span title="手札">✋${op.hand.length}</span>
          <span title="トラッシュ">🗑${op.trash.length}</span>
        </span>
      </div>
      <div class="bench opp">${this.benchHtml(1)}</div>
      <div class="arena opp">${this.slotHtml(1, 'active')}</div>
      <button class="center" data-act="log">
        <span class="turn-no">T${b.turn}</span>
        <span class="status ${b.current === 0 ? 'mine' : 'theirs'}">${status}</span>
        <span class="lastlog">${CBR.ui.esc(lastLog)}</span>
      </button>
      <div class="arena me">${this.slotHtml(0, 'active')}</div>
      <div class="bench me">${this.benchHtml(0)}</div>
      <div class="pbar me">
        <span class="ko" title="KOポイント">${ko(me.ko)}</span>
        <span class="piles">
          <span title="山札">🂠${me.deck.length}</span>
          <span title="トラッシュ">🗑${me.trash.length}</span>
          <span class="eflag ${me.energyUsed ? 'used' : ''}" title="エネルギー">⚡${me.energyUsed ? '済' : '可'}</span>
        </span>
        <button class="btn small end" data-act="end" ${myTurn && b.canEndTurn(0) ? '' : 'disabled'}>ターン終了</button>
      </div>
      <div class="hand">${me.hand.map((c, i) => this.handCardHtml(c, i, myTurn)).join('') || '<span class="hand-empty">手札なし</span>'}</div>
    </div>`;
  },

  benchHtml(p) {
    const pl = this.b.players[p];
    let html = '';
    for (let i = 0; i < CBR.Battle.BENCH_MAX; i++) {
      html += pl.bench[i] ? this.slotHtml(p, i) : '<div class="slot empty"><span>ベンチ</span></div>';
    }
    return html;
  },

  slotHtml(p, pos) {
    const b = this.b;
    const slot = b.slotOf(p, pos);
    if (!slot) return `<div class="slot empty ${pos === 'active' ? 'active' : ''}"><span>バトル場</span></div>`;
    const m = slot.card.mon;
    const s = CBR.SPECIES[m.speciesId];
    const max = b.maxHp(slot), hp = b.hpLeft(slot);
    const ratio = hp / max;
    const canAct = b.phase === 'main' && b.current === 0 && p === 0 && pos === 'active' &&
      s.attacks.some((_, i) => b.canAttack(0, i));
    return `<button class="slot mon ${pos === 'active' ? 'active' : 'benched'} ${canAct ? 'ready' : ''}"
        style="${CBR.ui.typeStyle(s.type)}" data-act="slot" data-arg="${p}:${pos}" data-slot="${p}-${pos}">
      <span class="mon-top"><span class="mon-name">${CBR.ui.esc(s.name)}</span><span class="mon-lv">Lv${m.level}</span></span>
      <span class="mon-emoji">${s.emoji}</span>
      <span class="hpbar ${ratio <= 0.3 ? 'low' : ratio <= 0.6 ? 'mid' : ''}"><i style="width:${ratio * 100}%"></i></span>
      <span class="mon-hp">${hp}/${max}</span>
      <span class="mon-energy">${slot.energies.map(e => CBR.ui.energyIcon(e.type)).join('')}</span>
    </button>`;
  },

  handCardHtml(c, i, myTurn) {
    if (c.kind === 'energy') {
      const t = CBR.TYPES[c.type];
      const playable = myTurn && this.b.canAttachEnergy(0);
      return `<button class="hcard energy ${playable ? 'playable' : ''}" style="--tc:${t.color}" data-act="hand" data-arg="${i}">
        <span class="h-emoji">${t.icon}</span><span class="h-name">${t.name}エネ</span></button>`;
    }
    const s = CBR.SPECIES[c.mon.speciesId];
    const playable = myTurn && this.b.canPlayMonster(0);
    return `<button class="hcard monster ${playable ? 'playable' : ''}" style="${CBR.ui.typeStyle(s.type)}" data-act="hand" data-arg="${i}">
      <span class="h-lv">Lv${c.mon.level}</span>
      <span class="h-emoji">${s.emoji}</span><span class="h-name">${CBR.ui.esc(s.name)}</span>
      <span class="h-hp">HP${CBR.monster.maxHp(c.mon)}</span></button>`;
  },

  // ---------- 入力 ----------
  onClick(e) {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const { act, arg } = el.dataset;
    if (act === 'log') return this.openLogSheet();
    if (act === 'slot') {
      const [p, pos] = arg.split(':');
      return this.openSlotSheet(Number(p), pos === 'active' ? 'active' : Number(pos));
    }
    if (this.busy) return;
    if (act === 'hand') return this.openHandSheet(Number(arg));
    if (act === 'end') {
      if (this.b.endTurn(0)) this.step();
    }
  },

  myTurn() {
    return this.b.phase === 'main' && this.b.current === 0 && !this.busy;
  },

  openSetupSheet() {
    const hand = this.b.players[0].hand;
    const opts = hand.map((c, i) => (c.kind === 'monster' ? this.choiceHtml(c.mon, 'setup', i) : '')).join('');
    CBR.ui.openSheet(`<h3>最初にバトル場に出すモンスターを選んでください</h3><div class="choices">${opts}</div>`, {
      setup: arg => {
        CBR.ui.closeSheet();
        this.b.setupActive(0, Number(arg));
        this.b.start();
        this.step();
      },
    }, { dismissible: false });
  },

  openPromoteSheet() {
    const bench = this.b.players[0].bench;
    const opts = bench.map((s, i) => this.choiceHtml(s.card.mon, 'promote', i, s)).join('');
    CBR.ui.openSheet(`<h3>バトル場がきぜつ! 次に出すモンスターを選んでください</h3><div class="choices">${opts}</div>`, {
      promote: arg => {
        CBR.ui.closeSheet();
        this.b.promote(0, Number(arg));
        this.step();
      },
    }, { dismissible: false });
  },

  choiceHtml(mon, act, arg, slot) {
    const s = CBR.SPECIES[mon.speciesId];
    const max = CBR.monster.maxHp(mon);
    const hp = slot ? this.b.hpLeft(slot) : max;
    return `<button class="choice" style="${CBR.ui.typeStyle(s.type)}" data-act="${act}" data-arg="${arg}">
      <span class="c-emoji">${s.emoji}</span>
      <span class="c-body"><b>${CBR.ui.esc(s.name)} Lv${mon.level}</b><small>HP ${hp}/${max}${slot ? ' ・ ' + slot.energies.map(e => CBR.TYPES[e.type].icon).join('') : ''}</small></span>
    </button>`;
  },

  openHandSheet(handIdx) {
    const b = this.b;
    const card = b.players[0].hand[handIdx];
    if (!card) return;
    const my = this.myTurn();
    if (card.kind === 'monster') {
      const where = b.players[0].active ? 'ベンチに出す' : 'バトル場に出す';
      const ok = my && b.canPlayMonster(0);
      const reason = !my ? '' : ok ? '' : '<p class="note">ベンチがいっぱいです</p>';
      CBR.ui.openSheet(`${CBR.ui.monsterDetail(card.mon)}${reason}
        <button class="btn block" data-act="play" ${ok ? '' : 'disabled'}>${where}</button>`, {
        play: () => {
          CBR.ui.closeSheet();
          if (b.playMonster(0, handIdx)) this.step();
        },
      });
      return;
    }
    const t = CBR.TYPES[card.type];
    const ok = my && b.canAttachEnergy(0);
    const pl = b.players[0];
    const targets = [['active', pl.active], ...pl.bench.map((s, i) => [i, s])].filter(([, s]) => s);
    const list = targets.map(([pos, s]) => this.choiceHtml(s.card.mon, 'attach', pos, s)
      .replace('<button', `<button ${ok ? '' : 'disabled'}`)).join('');
    CBR.ui.openSheet(`<div class="energy-detail" style="--tc:${t.color}"><span>${t.icon}</span><b>${t.name}エネルギー</b></div>
      <p class="note">${ok ? '付けるモンスターを選んでください(1ターン1回)' : pl.energyUsed ? 'このターンはもうエネルギーを付けました' : my ? '場にモンスターがいません' : '自分のターンに使えます'}</p>
      <div class="choices">${list}</div>`, {
      attach: arg => {
        CBR.ui.closeSheet();
        if (b.attachEnergy(0, handIdx, arg === 'active' ? 'active' : Number(arg))) this.step();
      },
    });
  },

  openSlotSheet(p, pos) {
    const b = this.b;
    const slot = b.slotOf(p, pos);
    if (!slot) return;
    const mine = p === 0;
    const my = this.myTurn();
    const s = CBR.SPECIES[slot.card.mon.speciesId];
    let attackButtons = null;
    let extra = '';

    if (mine && pos === 'active') {
      attackButtons = i => {
        const ok = my && b.canAttack(0, i);
        const dmg = b.previewDamage(0, i);
        const label = ok ? `このワザを使う${dmg ? `(${dmg}ダメージ)` : ''}` : 'エネルギー不足';
        return my ? `<button class="btn small block atk-btn" data-act="attack" data-arg="${i}" ${ok ? '' : 'disabled'}>${label}</button>` : '';
      };
      if (my && b.isFirstPlayersFirstTurn()) extra += '<p class="note">先攻1ターン目はワザを使えません</p>';
      if (my && b.players[0].bench.length) {
        const can = b.players[0].bench.some((_, i) => b.canRetreat(0, i));
        extra += `<div class="retreat"><h4>にげる(★${s.retreat}: エネルギーをトラッシュ)</h4>
          ${b.players[0].retreated ? '<p class="note">このターンはもうにげました</p>' : !can ? '<p class="note">エネルギーが足りません</p>' : ''}
          <div class="choices">${b.players[0].bench.map((bs, i) => this.choiceHtml(bs.card.mon, 'retreat', i, bs)
            .replace('<button', `<button ${b.canRetreat(0, i) ? '' : 'disabled'}`)).join('')}</div></div>`;
      }
    }
    CBR.ui.openSheet(`${mine ? '' : '<div class="tag-enemy">相手のモンスター</div>'}
      ${CBR.ui.monsterDetail(slot.card.mon, { damage: slot.damage, energies: slot.energies, attackButtons })}${extra}`, {
      attack: arg => {
        CBR.ui.closeSheet();
        if (b.attack(0, Number(arg))) this.step();
      },
      retreat: arg => {
        CBR.ui.closeSheet();
        if (b.retreat(0, Number(arg))) this.step();
      },
    });
  },

  openLogSheet() {
    const logs = this.b.logs.slice(-80).reverse()
      .map(l => `<li class="${l.msg.startsWith('──') ? 'turnline' : ''}">${CBR.ui.esc(l.msg)}</li>`).join('');
    const canGiveUp = this.b.phase !== 'over' && this.b.phase !== 'setup';
    CBR.ui.openSheet(`<h3>バトルログ</h3><ol class="log">${logs}</ol>
      ${canGiveUp ? '<button class="btn ghost block" data-act="giveup">降参する</button>' : ''}`, {
      giveup: () => {
        if (!confirm('降参しますか?(敗北扱いになります)')) return;
        CBR.ui.closeSheet();
        this.b.log('あなたは降参した');
        this.b.finish(1);
        this.step();
      },
    });
  },

  // ---------- 進行 ----------
  // 状態が変わるたびに呼ぶ。演出 → 描画 → 次に必要な処理(AI・選択)へ
  async step() {
    if (!this.alive) return;
    const b = this.b;
    const events = b.takeEvents();
    // 自分が操作できない間は入力を止める
    this.busy = b.phase === 'over' || (b.phase === 'promote' && b.promoting === 1) || (b.phase === 'main' && b.current === 1);
    this.render();
    this.playEvents(events);

    if (b.phase === 'over') {
      await CBR.util.wait(1400);
      if (this.alive) CBR.app.finishBattle(this.stageIndex, b);
      return;
    }
    if (b.phase === 'promote') {
      if (b.promoting === 0) return this.openPromoteSheet();
      await CBR.util.wait(this.AI_DELAY);
      if (!this.alive) return;
      b.promote(1, CBR.ai.choosePromote(b, 1));
      return this.step();
    }
    if (b.phase === 'main' && b.current === 1) {
      await CBR.util.wait(this.AI_DELAY);
      if (!this.alive) return;
      this.aiActions = (this.aiTurn === b.turn ? this.aiActions : 0) + 1;
      this.aiTurn = b.turn;
      const act = this.aiActions > 20 ? null : CBR.ai.nextAction(b, 1);
      let ok = false;
      if (act) {
        if (act.type === 'play') ok = b.playMonster(1, act.handIdx);
        else if (act.type === 'energy') ok = b.attachEnergy(1, act.handIdx, act.pos);
        else if (act.type === 'retreat') ok = b.retreat(1, act.benchIdx);
        else if (act.type === 'attack') ok = b.attack(1, act.attackIdx);
      }
      if (!ok && !b.endTurn(1)) b.passTurn();
      return this.step();
    }
  },

  playEvents(events) {
    for (const ev of events) {
      if (ev.type === 'turnStart' && ev.p === 0) CBR.ui.banner('あなたのターン');
      if (ev.type === 'reshuffle') CBR.ui.toast(`${this.b.players[ev.p].name}の山札を再構築しました`);
      if (ev.type === 'damage' || ev.type === 'heal') {
        const el = this.root.querySelector(`[data-slot="${ev.p}-${ev.pos}"]`);
        const host = el || this.root.querySelector(`.${ev.p === 0 ? 'me' : 'opp'}.${ev.pos === 'active' ? 'arena' : 'bench'}`);
        if (!host) continue;
        const pop = document.createElement('span');
        pop.className = `pop ${ev.type} ${ev.weak ? 'weak' : ''}`;
        pop.textContent = ev.type === 'heal' ? `+${ev.amount}` : `-${ev.amount}`;
        host.appendChild(pop);
        if (el && ev.type === 'damage') el.classList.add('hit');
        setTimeout(() => pop.remove(), 1100);
      }
    }
  },
};
