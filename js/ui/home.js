window.CBR = window.CBR || {};
CBR.screens = CBR.screens || {};

CBR.screens.home = {
  mount(root) {
    const save = CBR.save;
    const count = save.deckCount();
    const stages = CBR.STAGES.map((st, i) => {
      const unlocked = save.isUnlocked(i);
      const cleared = save.isCleared(st.id);
      return `<button class="stage ${cleared ? 'cleared' : ''}" data-act="stage" data-arg="${i}" ${unlocked ? '' : 'disabled'}>
        <span class="stage-no">${i + 1}</span>
        <span class="stage-info">
          <b>${CBR.ui.esc(st.name)}</b>
          <small>${st.enemyIcon} ${CBR.ui.esc(st.enemyName)} ・ 敵Lv${st.level[0]}〜${st.level[1]}</small>
        </span>
        <span class="stage-state">${cleared ? '✔ クリア' : unlocked ? '挑戦' : '🔒'}</span>
      </button>`;
    }).join('');

    root.innerHTML = `<div class="screen home">
      <header class="home-head">
        <div class="logo">🃏 CARD BATTLE <span>RPG</span></div>
        <div class="home-sub">モンスターを育ててステージを攻略しよう</div>
      </header>
      <div class="home-menu">
        <button class="btn" data-act="deck">🗂 デッキ編成 <small class="${count === 40 ? '' : 'warn'}">${count}/40</small></button>
        <button class="btn ghost" data-act="rules">📖 遊び方</button>
      </div>
      <h2 class="section-title">ステージ</h2>
      <div class="stages">${stages}</div>
      <footer class="home-foot">
        <span>所持モンスター ${save.data.monsters.length}体</span>
        <button class="link" data-act="reset">データ初期化</button>
      </footer>
    </div>`;

    root.onclick = e => {
      const el = e.target.closest('[data-act]');
      if (!el || el.disabled) return;
      const act = el.dataset.act;
      if (act === 'stage') {
        if (CBR.save.deckCount() !== 40) return CBR.ui.toast('デッキを40枚にしてください');
        if (!CBR.save.data.deck.monsterUids.length) return CBR.ui.toast('デッキにモンスターを入れてください');
        CBR.app.show('battle', { stageIndex: Number(el.dataset.arg) });
      } else if (act === 'deck') {
        CBR.app.show('deck');
      } else if (act === 'rules') {
        this.showRules();
      } else if (act === 'reset') {
        if (confirm('セーブデータを初期化します。よろしいですか?')) {
          CBR.save.reset();
          CBR.app.show('home');
        }
      }
    };
  },

  showRules() {
    CBR.ui.openSheet(`<div class="rules">
      <h3>遊び方</h3>
      <ul>
        <li>デッキは<b>40枚</b>(モンスター+エネルギー)。初期手札は<b>5枚</b>。</li>
        <li>ターンの最初に<b>2枚</b>ドロー(先攻1ターン目は1枚)。手札上限なし。</li>
        <li>山札が尽きたら<b>トラッシュをシャッフル</b>して山札に戻します。</li>
        <li>モンスターは<b>バトル場1体・ベンチ3体</b>まで。</li>
        <li>エネルギーは<b>1ターンに1枚</b>、自分のモンスターに付けられます。</li>
        <li>バトル場のモンスターがワザを使うとターン終了。★はどの属性でも払えます。</li>
        <li>にげる: ★の数だけエネルギーをトラッシュしてベンチと入れ替え(1ターン1回)。</li>
        <li>弱点の属性から攻撃されるとダメージ<b>×1.5</b>。</li>
        <li>相手を<b>3体きぜつ</b>させたら勝利!</li>
        <li>先攻1ターン目はワザを使えません。</li>
      </ul>
      <h3>育成</h3>
      <ul>
        <li>モンスターは1枚ごとに<b>レベルと経験値</b>を持ちます。</li>
        <li>相手をきぜつさせたり、バトルに出るとEXPを獲得。</li>
        <li>レベルが上がるとHPとワザの威力がアップ。</li>
        <li>ステージ初回クリアで新しいモンスターが仲間に。</li>
      </ul>
    </div>`);
  },
};
