# Card Battle RPG

ブラウザで遊べる育成型カードバトルRPG(PC・スマートフォン対応)。
仕様・ルール・画面設計は [docs/DESIGN.md](docs/DESIGN.md) を参照。

## 起動方法

ビルド不要。どちらかの方法で開く。

- `index.html` をブラウザで直接開く
- 開発用サーバー(Node/Python 不要):

```bash
powershell -ExecutionPolicy Bypass -File tools/serve.ps1
```

→ http://localhost:8080/

## スマートフォンで遊ぶ

静的ファイルのみなので、GitHub Pages / Netlify などにフォルダごと置けばそのまま動く。
セーブデータはブラウザの localStorage(`cbrpg_save_v1`)に保存される。
