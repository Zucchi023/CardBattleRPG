window.CBR = window.CBR || {};
CBR.screens = CBR.screens || {};

CBR.screens.result = {
  // summary: { win, stageIndex, ko, gains: [{ m, before, gained, ups }], reward }
  mount(root, summary) {
    const { win, stageIndex, gains, reward } = summary;
    const stage = CBR.STAGES[stageIndex];
    const rows = gains.map(g => {
      const s = CBR.SPECIES[g.m.speciesId];
      return `<li class="gain" style="${CBR.ui.typeStyle(s.type)}">
        <span class="g-emoji">${s.emoji}</span>
        <span class="g-body">
          <b>${CBR.ui.esc(s.name)}</b>
          <small>Lv${g.before}${g.ups ? ` → <em>Lv${g.m.level}</em>` : ''} ・ +${g.gained} EXP</small>
          ${CBR.ui.expBar(g.m)}
        </span>
        ${g.ups ? '<span class="lvup">LEVEL UP!</span>' : ''}
      </li>`;
    }).join('');

    root.innerHTML = `<div class="screen result ${win ? 'win' : 'lose'}">
      <div class="result-head">
        <div class="result-title">${win ? 'WIN!' : 'LOSE…'}</div>
        <div class="result-sub">${CBR.ui.esc(stage.name)} ・ ${stage.enemyIcon} ${CBR.ui.esc(stage.enemyName)}</div>
      </div>
      ${reward ? `<div class="reward"><h3>🎁 初回クリア報酬! 新しい仲間</h3>${CBR.ui.monsterTile(reward, 'big')}
        <p class="hint">デッキ編成でデッキに入れられます</p></div>` : ''}
      <h3 class="section-title">獲得経験値</h3>
      <ul class="gains">${rows || '<li class="empty">なし</li>'}</ul>
      <div class="result-actions">
        <button class="btn" data-act="home">ホームへ</button>
        <button class="btn ghost" data-act="retry">もう一度</button>
      </div>
    </div>`;

    root.onclick = e => {
      const el = e.target.closest('[data-act]');
      if (!el) return;
      if (el.dataset.act === 'home') CBR.app.show('home');
      if (el.dataset.act === 'retry') CBR.app.show('battle', { stageIndex });
    };
  },
};
