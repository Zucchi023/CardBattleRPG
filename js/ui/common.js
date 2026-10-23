window.CBR = window.CBR || {};

// 画面共通の部品(ボトムシート・トースト・カード表示)
CBR.ui = {
  esc: s => CBR.util.escape(s),

  // ---------- ボトムシート ----------
  // actions: { name: fn } 。シート内の [data-act="name"] がタップされたら呼ばれる
  openSheet(html, actions = {}, { dismissible = true } = {}) {
    this.closeSheet();
    const wrap = document.createElement('div');
    wrap.className = 'sheet-backdrop';
    wrap.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">
      ${dismissible ? '<button class="sheet-close" data-act="__close" aria-label="閉じる">✕</button>' : ''}
      <div class="sheet-body">${html}</div></div>`;
    wrap.addEventListener('click', e => {
      if (e.target === wrap && dismissible) return this.closeSheet();
      const el = e.target.closest('[data-act]');
      if (!el || el.disabled) return;
      if (el.dataset.act === '__close') return this.closeSheet();
      const fn = actions[el.dataset.act];
      if (fn) fn(el.dataset.arg, el);
    });
    document.body.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add('open'));
    this.sheetEl = wrap;
  },

  closeSheet() {
    if (this.sheetEl) {
      this.sheetEl.remove();
      this.sheetEl = null;
    }
  },

  toast(msg, ms = 1800) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, ms);
  },

  banner(msg) {
    const el = document.createElement('div');
    el.className = 'banner';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1300);
  },

  // ---------- カード表示 ----------
  energyIcon(type) {
    if (type === CBR.ANY) return '<span class="eicon any" title="無色">★</span>';
    const t = CBR.TYPES[type];
    return `<span class="eicon" style="--c:${t.color}" title="${t.name}">${t.icon}</span>`;
  },

  costHtml(cost) {
    return `<span class="cost">${cost.map(c => this.energyIcon(c)).join('')}</span>`;
  },

  typeStyle(type) {
    return `--tc:${CBR.TYPES[type].color}`;
  },

  expBar(m) {
    if (m.level >= CBR.monster.MAX_LEVEL) return '<div class="expbar max"><i style="width:100%"></i></div>';
    const need = CBR.monster.expToNext(m.level);
    return `<div class="expbar" title="EXP ${m.exp}/${need}"><i style="width:${Math.min(100, m.exp / need * 100)}%"></i></div>`;
  },

  // 詳細表示(シート用)。m は個体 { speciesId, level, exp?, uid? }
  monsterDetail(m, { damage = 0, energies = null, attackButtons = null } = {}) {
    const s = CBR.SPECIES[m.speciesId];
    const t = CBR.TYPES[s.type];
    const max = CBR.monster.maxHp(m);
    const hp = max - damage;
    const attacks = s.attacks.map((a, i) => {
      const dmg = CBR.monster.attackDamage(m, a);
      const btn = attackButtons ? attackButtons(i) : '';
      return `<div class="atk">
        <div class="atk-head">${this.costHtml(a.cost)}<b>${this.esc(a.name)}</b><span class="atk-dmg">${dmg || ''}</span></div>
        ${a.text ? `<div class="atk-text">${this.esc(a.text)}</div>` : ''}
        ${btn}
      </div>`;
    }).join('');
    return `<div class="detail" style="${this.typeStyle(s.type)}">
      <div class="detail-head">
        <div class="detail-emoji">${s.emoji}</div>
        <div class="detail-title">
          <div class="detail-name">${this.esc(s.name)} <span class="lv">Lv${m.level}</span></div>
          <div class="detail-sub">${t.icon}${t.name}タイプ ・ 弱点 ${CBR.TYPES[t.weakTo].icon} ・ にげる ${'★'.repeat(s.retreat)}</div>
          ${m.exp !== undefined ? `<div class="detail-exp">EXP ${m.exp}/${CBR.monster.expToNext(m.level)} ${this.expBar(m)}</div>` : ''}
        </div>
        <div class="detail-hp"><small>HP</small>${hp}<small>/${max}</small></div>
      </div>
      ${energies ? `<div class="detail-energy">付いているエネルギー: ${energies.length ? energies.map(e => this.energyIcon(e.type)).join('') : 'なし'}</div>` : ''}
      <div class="atks">${attacks}</div>
      ${m.uid ? `<div class="uid">ID: ${this.esc(m.uid)}</div>` : ''}
    </div>`;
  },

  // 一覧用の小さなカード
  monsterTile(m, extraClass = '') {
    const s = CBR.SPECIES[m.speciesId];
    return `<div class="tile ${extraClass}" style="${this.typeStyle(s.type)}">
      <div class="tile-emoji">${s.emoji}</div>
      <div class="tile-name">${this.esc(s.name)}</div>
      <div class="tile-lv">Lv${m.level} <small>HP${CBR.monster.maxHp(m)}</small></div>
      ${this.expBar(m)}
    </div>`;
  },
};
