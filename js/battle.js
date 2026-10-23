window.CBR = window.CBR || {};

/*
 * バトルエンジン(UI非依存)
 *  players[0] = プレイヤー, players[1] = 敵
 *  UI は各操作メソッドを呼んだあと events を消費して演出し、状態を描画する。
 */
CBR.Battle = class Battle {
  static HAND_START = 5;
  static DRAW_PER_TURN = 2;
  static FIRST_TURN_DRAW = 1;
  static BENCH_MAX = 3;
  static KO_TO_WIN = 3;
  static WEAKNESS_RATE = 1.5;

  constructor({ player, enemy }) {
    this.nextBid = 1;
    this.players = [this.makePlayer(player), this.makePlayer(enemy)];
    this.turn = 0;
    this.current = 0;
    this.first = 0;
    this.phase = 'setup'; // setup | main | promote | over
    this.winner = null;
    this.logs = [];
    this.events = [];
    this.expGains = {}; // uid -> KOで得た経験値
  }

  // side: { name, icon, monsters: [個体], energy: { type: 枚数 } }
  makePlayer(side) {
    const deck = side.monsters.map(m => ({
      bid: this.nextBid++, kind: 'monster',
      mon: { uid: m.uid, speciesId: m.speciesId, level: m.level },
    }));
    for (const t of CBR.TYPE_ORDER) {
      for (let i = 0; i < (side.energy[t] || 0); i++) deck.push({ bid: this.nextBid++, kind: 'energy', type: t });
    }
    return {
      name: side.name, icon: side.icon,
      deck: CBR.util.shuffle(deck), hand: [], trash: [],
      active: null, bench: [], ko: 0,
      energyUsed: false, retreated: false,
      participated: new Set(),
    };
  }

  // ---------- ログ・イベント ----------
  log(msg) {
    this.logs.push({ turn: this.turn, msg });
  }

  emit(evt) {
    this.events.push(evt);
  }

  takeEvents() {
    const e = this.events;
    this.events = [];
    return e;
  }

  // ---------- 参照系 ----------
  opponentOf(p) {
    return 1 - p;
  }

  slotOf(p, pos) {
    const pl = this.players[p];
    return pos === 'active' ? pl.active : pl.bench[pos];
  }

  maxHp(slot) {
    return CBR.monster.maxHp(slot.card.mon);
  }

  hpLeft(slot) {
    return Math.max(0, this.maxHp(slot) - slot.damage);
  }

  hasMonsterInHand(p) {
    return this.players[p].hand.some(c => c.kind === 'monster');
  }

  hasFieldMonster(p) {
    const pl = this.players[p];
    return !!pl.active || pl.bench.length > 0;
  }

  isFirstPlayersFirstTurn() {
    return this.turn === 1;
  }

  canPay(energies, cost) {
    const pool = {};
    for (const e of energies) pool[e.type] = (pool[e.type] || 0) + 1;
    let any = 0;
    for (const c of cost) {
      if (c === CBR.ANY) { any++; continue; }
      if (!pool[c]) return false;
      pool[c]--;
    }
    return Object.values(pool).reduce((a, b) => a + b, 0) >= any;
  }

  canAttack(p, attackIdx) {
    if (this.phase !== 'main' || this.current !== p) return false;
    if (this.isFirstPlayersFirstTurn()) return false;
    const pl = this.players[p];
    if (!pl.active) return false;
    if (!this.players[this.opponentOf(p)].active) return false;
    const atk = CBR.SPECIES[pl.active.card.mon.speciesId].attacks[attackIdx];
    return !!atk && this.canPay(pl.active.energies, atk.cost);
  }

  canRetreat(p, benchIdx) {
    const pl = this.players[p];
    if (this.phase !== 'main' || this.current !== p || pl.retreated) return false;
    if (!pl.active || !pl.bench[benchIdx]) return false;
    return pl.active.energies.length >= CBR.SPECIES[pl.active.card.mon.speciesId].retreat;
  }

  canPlayMonster(p) {
    const pl = this.players[p];
    return this.phase === 'main' && this.current === p && (!pl.active || pl.bench.length < Battle.BENCH_MAX);
  }

  canAttachEnergy(p) {
    return this.phase === 'main' && this.current === p && !this.players[p].energyUsed && this.hasFieldMonster(p);
  }

  canEndTurn(p) {
    if (this.phase !== 'main' || this.current !== p) return false;
    // 場が空で手札にモンスターがいるなら、まず出す必要がある
    return this.hasFieldMonster(p) || !this.hasMonsterInHand(p);
  }

  // 見込みダメージ(弱点込み)
  previewDamage(p, attackIdx) {
    const pl = this.players[p];
    const def = this.players[this.opponentOf(p)].active;
    if (!pl.active) return 0;
    const atk = CBR.SPECIES[pl.active.card.mon.speciesId].attacks[attackIdx];
    let dmg = CBR.monster.attackDamage(pl.active.card.mon, atk);
    if (dmg > 0 && def) {
      const atkType = CBR.SPECIES[pl.active.card.mon.speciesId].type;
      const defType = CBR.SPECIES[def.card.mon.speciesId].type;
      if (CBR.TYPES[defType].weakTo === atkType) dmg = Math.floor(dmg * Battle.WEAKNESS_RATE);
    }
    return dmg;
  }

  // ---------- 準備 ----------
  drawCards(p, n) {
    const pl = this.players[p];
    let drawn = 0;
    for (let i = 0; i < n; i++) {
      if (pl.deck.length === 0) {
        if (pl.trash.length === 0) break;
        pl.deck = CBR.util.shuffle(pl.trash);
        pl.trash = [];
        this.log(`${pl.name}の山札が尽きた。トラッシュをシャッフルして山札を再構築(${pl.deck.length}枚)`);
        this.emit({ type: 'reshuffle', p });
      }
      pl.hand.push(pl.deck.pop());
      drawn++;
    }
    return drawn;
  }

  // 初期手札5枚。モンスターがいなければ引き直し
  dealOpeningHands() {
    for (let p = 0; p < 2; p++) {
      const pl = this.players[p];
      let mulligans = 0;
      for (;;) {
        this.drawCards(p, Battle.HAND_START);
        if (this.hasMonsterInHand(p)) break;
        pl.deck = CBR.util.shuffle([...pl.deck, ...pl.hand]);
        pl.hand = [];
        mulligans++;
      }
      if (mulligans) this.log(`${pl.name}は手札にモンスターがいないため${mulligans}回引き直した`);
    }
  }

  // 準備フェーズでバトル場に出す
  setupActive(p, handIdx) {
    const pl = this.players[p];
    const card = pl.hand[handIdx];
    if (this.phase !== 'setup' || pl.active || !card || card.kind !== 'monster') return false;
    pl.hand.splice(handIdx, 1);
    pl.active = this.makeSlot(card);
    pl.participated.add(card.mon.uid);
    return true;
  }

  start() {
    this.first = Math.random() < 0.5 ? 0 : 1;
    this.log(`コイントス… ${this.players[this.first].name}の先攻!`);
    this.startTurn(this.first);
  }

  makeSlot(card) {
    return { card, damage: 0, energies: [] };
  }

  // ---------- ターン進行 ----------
  startTurn(p) {
    const pl = this.players[p];
    this.turn++;
    this.current = p;
    this.phase = 'main';
    pl.energyUsed = false;
    pl.retreated = false;
    const n = this.turn === 1 ? Battle.FIRST_TURN_DRAW : Battle.DRAW_PER_TURN;
    const drawn = this.drawCards(p, n);
    this.log(`── ターン${this.turn}: ${pl.name}のターン(${drawn}枚ドロー)`);
    this.emit({ type: 'turnStart', p });
    if (!this.hasFieldMonster(p) && !this.hasMonsterInHand(p)) {
      this.log(`${pl.name}は戦えるモンスターがいない!`);
      this.finish(this.opponentOf(p));
    }
  }

  endTurn(p) {
    if (!this.canEndTurn(p)) return false;
    this.log(`${this.players[p].name}はターンを終了した`);
    this.passTurn();
    return true;
  }

  passTurn() {
    if (this.phase === 'over') return;
    const next = this.opponentOf(this.current);
    const npl = this.players[next];
    if (!npl.active && npl.bench.length > 0) {
      // バトル場がきぜつ → 次のプレイヤーがベンチから選ぶ
      this.phase = 'promote';
      this.promoting = next;
      return;
    }
    this.startTurn(next);
  }

  promote(p, benchIdx) {
    const pl = this.players[p];
    if (this.phase !== 'promote' || this.promoting !== p || !pl.bench[benchIdx]) return false;
    pl.active = pl.bench.splice(benchIdx, 1)[0];
    this.log(`${pl.name}は${this.nameOf(pl.active)}をバトル場に出した`);
    this.promoting = null;
    this.startTurn(p);
    return true;
  }

  // ---------- メインフェーズの操作 ----------
  nameOf(slotOrCard) {
    const card = slotOrCard.card || slotOrCard;
    return `${CBR.SPECIES[card.mon.speciesId].name}(Lv${card.mon.level})`;
  }

  playMonster(p, handIdx) {
    const pl = this.players[p];
    const card = pl.hand[handIdx];
    if (!card || card.kind !== 'monster' || !this.canPlayMonster(p)) return false;
    pl.hand.splice(handIdx, 1);
    const slot = this.makeSlot(card);
    pl.participated.add(card.mon.uid);
    if (!pl.active) {
      pl.active = slot;
      this.log(`${pl.name}は${this.nameOf(card)}をバトル場に出した`);
    } else {
      pl.bench.push(slot);
      this.log(`${pl.name}は${this.nameOf(card)}をベンチに出した`);
    }
    this.emit({ type: 'play', p });
    return true;
  }

  attachEnergy(p, handIdx, pos) {
    const pl = this.players[p];
    const card = pl.hand[handIdx];
    const slot = this.slotOf(p, pos);
    if (!card || card.kind !== 'energy' || !slot || !this.canAttachEnergy(p)) return false;
    pl.hand.splice(handIdx, 1);
    slot.energies.push(card);
    pl.energyUsed = true;
    this.log(`${pl.name}は${this.nameOf(slot)}に${CBR.TYPES[card.type].icon}エネルギーを付けた`);
    this.emit({ type: 'energy', p, pos });
    return true;
  }

  retreat(p, benchIdx) {
    if (!this.canRetreat(p, benchIdx)) return false;
    const pl = this.players[p];
    const cost = CBR.SPECIES[pl.active.card.mon.speciesId].retreat;
    pl.trash.push(...pl.active.energies.splice(pl.active.energies.length - cost, cost));
    const old = pl.active;
    pl.active = pl.bench[benchIdx];
    pl.bench[benchIdx] = old;
    pl.retreated = true;
    this.log(`${pl.name}の${this.nameOf(old)}はにげた。${this.nameOf(pl.active)}がバトル場へ`);
    return true;
  }

  attack(p, attackIdx) {
    if (!this.canAttack(p, attackIdx)) return false;
    const pl = this.players[p];
    const o = this.opponentOf(p);
    const opl = this.players[o];
    const atkSlot = pl.active;
    const atk = CBR.SPECIES[atkSlot.card.mon.speciesId].attacks[attackIdx];
    const fx = atk.effect || {};
    const dmg = this.previewDamage(p, attackIdx);
    const base = CBR.monster.attackDamage(atkSlot.card.mon, atk);

    this.log(`${pl.name}の${this.nameOf(atkSlot)}の「${atk.name}」!`);
    if (dmg > 0) {
      opl.active.damage += dmg;
      this.log(`${this.nameOf(opl.active)}に${dmg}ダメージ${dmg > base ? '(弱点!)' : ''}`);
      this.emit({ type: 'damage', p: o, pos: 'active', amount: dmg, weak: dmg > base });
    }
    if (fx.benchDamage) {
      opl.bench.forEach((s, i) => {
        s.damage += fx.benchDamage;
        this.emit({ type: 'damage', p: o, pos: i, amount: fx.benchDamage });
      });
      if (opl.bench.length) this.log(`相手のベンチ全員に${fx.benchDamage}ダメージ`);
    }
    if (fx.heal) {
      const healed = Math.min(fx.heal, atkSlot.damage);
      atkSlot.damage -= healed;
      if (healed) {
        this.log(`${this.nameOf(atkSlot)}はHPを${healed}回復した`);
        this.emit({ type: 'heal', p, pos: 'active', amount: healed });
      }
    }
    if (fx.draw) {
      this.drawCards(p, fx.draw);
      this.log(`${pl.name}は山札を${fx.draw}枚引いた`);
    }
    if (fx.discardSelf) {
      const n = Math.min(fx.discardSelf, atkSlot.energies.length);
      pl.trash.push(...atkSlot.energies.splice(0, n));
      if (n) this.log(`${this.nameOf(atkSlot)}のエネルギーを${n}個トラッシュした`);
    }

    this.resolveKnockouts(p);
    if (this.phase !== 'over') this.passTurn();
    return true;
  }

  resolveKnockouts(attacker) {
    const o = this.opponentOf(attacker);
    const opl = this.players[o];
    const pl = this.players[attacker];
    const atkUid = pl.active.card.mon.uid;
    const knocked = [];
    if (opl.active && this.hpLeft(opl.active) <= 0) {
      knocked.push(opl.active);
      opl.active = null;
    }
    opl.bench = opl.bench.filter(s => {
      if (this.hpLeft(s) > 0) return true;
      knocked.push(s);
      return false;
    });
    for (const s of knocked) {
      opl.trash.push(s.card, ...s.energies);
      pl.ko++;
      this.expGains[atkUid] = (this.expGains[atkUid] || 0) + CBR.monster.koExp(s.card.mon.level);
      this.log(`${opl.name}の${this.nameOf(s)}はきぜつした!(KO ${pl.ko}/${Battle.KO_TO_WIN})`);
      this.emit({ type: 'ko', p: o });
    }
    if (pl.ko >= Battle.KO_TO_WIN) this.finish(attacker);
  }

  finish(winner) {
    this.phase = 'over';
    this.winner = winner;
    this.log(`${this.players[winner].name}の勝利!`);
    this.emit({ type: 'over', winner });
  }

  // プレイヤー側の獲得経験値: uid -> { ko, part, total }
  playerExpResults() {
    const pl = this.players[0];
    const part = this.winner === 0 ? CBR.monster.PARTICIPATION_EXP.win : CBR.monster.PARTICIPATION_EXP.lose;
    const res = {};
    for (const uid of pl.participated) {
      const ko = this.expGains[uid] || 0;
      res[uid] = { ko, part, total: ko + part };
    }
    return res;
  }
};
