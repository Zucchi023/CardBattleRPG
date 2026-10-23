window.CBR = window.CBR || {};

// 属性。weakTo: この属性から攻撃されるとダメージ×1.5
CBR.TYPES = {
  fire:    { name: '火', icon: '🔥', color: '#e5533d', weakTo: 'water' },
  water:   { name: '水', icon: '💧', color: '#3b82f6', weakTo: 'thunder' },
  thunder: { name: '雷', icon: '⚡', color: '#d9a400', weakTo: 'grass' },
  grass:   { name: '草', icon: '🌿', color: '#22a35a', weakTo: 'fire' },
};
CBR.TYPE_ORDER = ['fire', 'water', 'thunder', 'grass'];
// ワザコストの無色(どの属性でも可)
CBR.ANY = 'any';

/*
 * モンスター種族マスタ
 *  hp/hpUp: 基本HPとレベルごとの上昇量
 *  atkUp: ワザ威力のレベルごとの上昇量
 *  attacks[].cost: 属性キー or 'any' の配列
 *  attacks[].effect: { heal, draw, benchDamage, discardSelf }
 */
CBR.SPECIES = {
  hinokon: {
    name: 'ヒノコン', type: 'fire', emoji: '🦊', hp: 50, hpUp: 6, atkUp: 2, retreat: 1,
    attacks: [
      { name: 'ひっかく', cost: ['any'], damage: 10 },
      { name: 'ひのこ', cost: ['fire', 'any'], damage: 30 },
    ],
  },
  kaenbull: {
    name: 'カエンブル', type: 'fire', emoji: '🐂', hp: 80, hpUp: 8, atkUp: 3, retreat: 2,
    attacks: [
      { name: 'とっしん', cost: ['any', 'any'], damage: 30 },
      { name: 'フレイムホーン', cost: ['fire', 'fire', 'any'], damage: 70 },
    ],
  },
  infernodra: {
    name: 'インフェルドラ', type: 'fire', emoji: '🐉', hp: 120, hpUp: 10, atkUp: 4, retreat: 3,
    attacks: [
      { name: 'かえんのいき', cost: ['fire', 'any'], damage: 40 },
      { name: 'ごうかブレス', cost: ['fire', 'fire', 'fire', 'any'], damage: 130, effect: { discardSelf: 2 }, text: '自分のエネルギーを2個トラッシュ' },
    ],
  },
  shizukko: {
    name: 'シズッコ', type: 'water', emoji: '🐸', hp: 50, hpUp: 6, atkUp: 2, retreat: 1,
    attacks: [
      { name: 'みずでっぽう', cost: ['water'], damage: 20 },
      { name: 'いやしのしずく', cost: ['water', 'any'], damage: 20, effect: { heal: 20 }, text: '自分のHPを20回復' },
    ],
  },
  aquaseal: {
    name: 'アクアシール', type: 'water', emoji: '🦭', hp: 90, hpUp: 8, atkUp: 3, retreat: 2,
    attacks: [
      { name: 'なみのり', cost: ['water', 'any'], damage: 40 },
      { name: 'アイスタックル', cost: ['water', 'water', 'any'], damage: 60 },
    ],
  },
  leviathan: {
    name: 'リヴァイア', type: 'water', emoji: '🐋', hp: 130, hpUp: 10, atkUp: 4, retreat: 3,
    attacks: [
      { name: 'アクアテール', cost: ['water', 'any', 'any'], damage: 50 },
      { name: 'タイダルウェーブ', cost: ['water', 'water', 'water', 'any'], damage: 90, effect: { benchDamage: 20 }, text: '相手のベンチ全員に20ダメージ' },
    ],
  },
  biritch: {
    name: 'ビリッチ', type: 'thunder', emoji: '🐹', hp: 50, hpUp: 5, atkUp: 2, retreat: 1,
    attacks: [
      { name: 'でんきショック', cost: ['thunder'], damage: 20 },
      { name: 'スパーク', cost: ['thunder', 'any'], damage: 20, effect: { benchDamage: 10 }, text: '相手のベンチ全員に10ダメージ' },
    ],
  },
  raijuu: {
    name: 'ライジュウ', type: 'thunder', emoji: '🐺', hp: 80, hpUp: 7, atkUp: 3, retreat: 1,
    attacks: [
      { name: 'かみなりのキバ', cost: ['thunder', 'any'], damage: 40 },
      { name: 'ボルトラッシュ', cost: ['thunder', 'thunder', 'any'], damage: 70 },
    ],
  },
  thunderbird: {
    name: 'サンダバード', type: 'thunder', emoji: '🦅', hp: 110, hpUp: 9, atkUp: 4, retreat: 2,
    attacks: [
      { name: 'いなずま', cost: ['thunder', 'thunder'], damage: 50 },
      { name: 'ギガボルト', cost: ['thunder', 'thunder', 'thunder', 'any'], damage: 120, effect: { discardSelf: 2 }, text: '自分のエネルギーを2個トラッシュ' },
    ],
  },
  mebuki: {
    name: 'メブキ', type: 'grass', emoji: '🌱', hp: 60, hpUp: 6, atkUp: 2, retreat: 1,
    attacks: [
      { name: 'はっぱカッター', cost: ['grass'], damage: 20 },
      { name: 'こうごうせい', cost: ['any'], damage: 0, effect: { heal: 20, draw: 1 }, text: '自分のHPを20回復し、山札を1枚引く' },
    ],
  },
  tsurugami: {
    name: 'ツルガミ', type: 'grass', emoji: '🐍', hp: 80, hpUp: 8, atkUp: 3, retreat: 1,
    attacks: [
      { name: 'まきつく', cost: ['grass', 'any'], damage: 30 },
      { name: 'どくのキバ', cost: ['grass', 'grass'], damage: 50 },
    ],
  },
  ogrove: {
    name: 'オーグローブ', type: 'grass', emoji: '🌳', hp: 140, hpUp: 11, atkUp: 4, retreat: 3,
    attacks: [
      { name: 'ねをはる', cost: ['grass'], damage: 0, effect: { heal: 50 }, text: '自分のHPを50回復' },
      { name: 'たいじゅのいかり', cost: ['grass', 'grass', 'any', 'any'], damage: 100 },
    ],
  },
};
