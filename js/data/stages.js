window.CBR = window.CBR || {};

/*
 * ステージ定義
 *  enemy.monsters: [speciesId, 枚数]
 *  enemy.energy: 属性ごとの枚数(モンスター枚数と合わせて40枚)
 *  level: [最小, 最大] 敵モンスターのLv
 *  rewards: 初回クリア時に1体もらえる候補
 */
CBR.STAGES = [
  {
    id: 's1', name: 'はじまりの草原', enemyName: '森の見習い', enemyIcon: '🧝', level: [1, 1],
    enemy: { monsters: [['mebuki', 8], ['tsurugami', 6], ['hinokon', 2]], energy: { grass: 20, fire: 4 } },
    rewards: ['mebuki', 'tsurugami'],
  },
  {
    id: 's2', name: 'しびれ洞窟', enemyName: '鉱夫ガロ', enemyIcon: '⛏️', level: [1, 2],
    enemy: { monsters: [['biritch', 8], ['raijuu', 6], ['shizukko', 2]], energy: { thunder: 20, water: 4 } },
    rewards: ['biritch', 'raijuu'],
  },
  {
    id: 's3', name: 'さざなみ海岸', enemyName: '漁師ミナ', enemyIcon: '🎣', level: [2, 3],
    enemy: { monsters: [['shizukko', 6], ['aquaseal', 6], ['leviathan', 2], ['biritch', 2]], energy: { water: 20, thunder: 4 } },
    rewards: ['aquaseal', 'leviathan'],
  },
  {
    id: 's4', name: 'ふかみの森', enemyName: '森の番人', enemyIcon: '🦉', level: [3, 4],
    enemy: { monsters: [['mebuki', 4], ['tsurugami', 6], ['ogrove', 3], ['raijuu', 3]], energy: { grass: 18, thunder: 6 } },
    rewards: ['tsurugami', 'ogrove'],
  },
  {
    id: 's5', name: 'かみなり山', enemyName: '雷術師ボルト', enemyIcon: '🧙', level: [4, 6],
    enemy: { monsters: [['biritch', 4], ['raijuu', 6], ['thunderbird', 3], ['ogrove', 3]], energy: { thunder: 17, grass: 7 } },
    rewards: ['raijuu', 'thunderbird'],
  },
  {
    id: 's6', name: '灼熱火山', enemyName: '竜使いエン', enemyIcon: '👑', level: [6, 8],
    enemy: { monsters: [['hinokon', 4], ['kaenbull', 6], ['infernodra', 3], ['aquaseal', 3]], energy: { fire: 17, water: 7 } },
    rewards: ['infernodra', 'thunderbird', 'leviathan', 'ogrove'],
  },
];
