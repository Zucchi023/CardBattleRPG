window.CBR = window.CBR || {};

// 敵の思考。1手ずつ返し、UI側が演出を挟みながら実行する
CBR.ai = {
  // 次に行う1手を返す(なければ null → ターン終了)
  nextAction(b, p) {
    const pl = b.players[p];
    const sp = s => CBR.SPECIES[s.card.mon.speciesId];

    // 1. モンスターを出す(バトル場→ベンチ)
    if (b.canPlayMonster(p)) {
      const idx = this.bestMonsterInHand(pl.hand);
      if (idx >= 0) return { type: 'play', handIdx: idx };
    }

    // 2. エネルギー
    if (b.canAttachEnergy(p)) {
      const plan = this.planEnergy(b, p);
      if (plan) return { type: 'energy', ...plan };
    }

    // 3. にげる: 使えるワザがなく、ベンチに使えるモンスターがいる / きぜつ寸前
    if (pl.active && !pl.retreated) {
      const usable = s => sp(s).attacks.some(a => b.canPay(s.energies, a.cost) && (a.damage > 0));
      const weak = b.hpLeft(pl.active) <= 20;
      if (!usable(pl.active) || weak) {
        const bi = pl.bench.findIndex(s => usable(s) && b.hpLeft(s) > b.hpLeft(pl.active));
        if (bi >= 0 && b.canRetreat(p, bi)) return { type: 'retreat', benchIdx: bi };
      }
    }

    // 4. ワザ
    const atk = this.bestAttack(b, p);
    if (atk >= 0) return { type: 'attack', attackIdx: atk };

    return null;
  },

  bestMonsterInHand(hand) {
    let best = -1, bestHp = -1;
    hand.forEach((c, i) => {
      if (c.kind !== 'monster') return;
      const hp = CBR.monster.maxHp(c.mon);
      if (hp > bestHp) { best = i; bestHp = hp; }
    });
    return best;
  },

  // まだ払えない一番強いワザに近づくエネルギーを選ぶ
  planEnergy(b, p) {
    const pl = b.players[p];
    const slots = [['active', pl.active], ...pl.bench.map((s, i) => [i, s])].filter(([, s]) => s);
    const energyIdx = pl.hand.map((c, i) => (c.kind === 'energy' ? i : -1)).filter(i => i >= 0);
    if (!energyIdx.length) return null;

    for (const [pos, slot] of slots) {
      const strongest = [...CBR.SPECIES[slot.card.mon.speciesId].attacks].sort((x, y) => y.damage - x.damage)[0];
      const before = this.missing(slot.energies, strongest.cost);
      if (before === 0) continue; // 最強ワザが払えるなら次のモンスターへ
      const idx = energyIdx.find(i => this.missing([...slot.energies, pl.hand[i]], strongest.cost) < before);
      if (idx !== undefined) return { handIdx: idx, pos };
    }
    // とりあえずバトル場に付ける
    return { handIdx: energyIdx[0], pos: pl.active ? 'active' : 0 };
  },

  // コストを払うのにあと何個エネルギーが足りないか
  missing(energies, cost) {
    const pool = {};
    for (const e of energies) pool[e.type] = (pool[e.type] || 0) + 1;
    let lack = 0, any = 0;
    for (const c of cost) {
      if (c === CBR.ANY) { any++; continue; }
      if (pool[c]) pool[c]--; else lack++;
    }
    const rest = Object.values(pool).reduce((a, b) => a + b, 0);
    return lack + Math.max(0, any - rest);
  },

  bestAttack(b, p) {
    const pl = b.players[p];
    if (!pl.active) return -1;
    const def = b.players[b.opponentOf(p)].active;
    const attacks = CBR.SPECIES[pl.active.card.mon.speciesId].attacks;
    let best = -1, bestScore = -1;
    attacks.forEach((a, i) => {
      if (!b.canAttack(p, i)) return;
      const dmg = b.previewDamage(p, i);
      let score = dmg;
      if (def && dmg >= b.hpLeft(def)) score += 1000;
      if (a.effect && a.effect.heal) score += Math.min(a.effect.heal, pl.active.damage);
      if (a.effect && a.effect.benchDamage) score += a.effect.benchDamage * b.players[b.opponentOf(p)].bench.length;
      if (score > bestScore) { best = i; bestScore = score; }
    });
    return bestScore > 0 ? best : -1;
  },

  choosePromote(b, p) {
    const pl = b.players[p];
    let best = 0, bestScore = -1;
    pl.bench.forEach((s, i) => {
      const score = b.hpLeft(s) + s.energies.length * 30;
      if (score > bestScore) { best = i; bestScore = score; }
    });
    return best;
  },

  chooseSetupActive(hand) {
    return this.bestMonsterInHand(hand);
  },
};
