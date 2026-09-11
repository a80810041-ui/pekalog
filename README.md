# ペカログ JUGGLER EDITION v2.1

GitHub Pagesにそのまま置けるセットです。

## いちばん簡単な公開手順

1. GitHubにログインして、新しいRepositoryを作る
   - Repository name: `pekalog`
   - Public を選ぶ
   - Create repository
2. このZIPを展開し、中の5ファイルをRepositoryへアップロード
   - index.html
   - manifest.webmanifest
   - sw.js
   - icon-192.png
   - icon-512.png
3. Repositoryの `Settings` → `Pages`
4. `Build and deployment` の Source を `Deploy from a branch`
5. Branchを `main`、Folderを `/(root)` にして Save
6. 数分後、Pages欄に表示されるURLをSafariで開く
7. iPhoneのSafariで 共有 → 「ホーム画面に追加」

これで普通のアプリのようにホーム画面から起動できます。
実戦データはブラウザのlocalStorageに保存されるため、SafariのWebサイトデータを消すと消える場合があります。
大事な実戦はアプリ内のJSON保存も併用してください。

## 更新方法
新しいバージョンができたら、同じRepositoryの `index.html` などを新しいファイルで置き換えます。
