# Firebase Functions セットアップガイド

Google Cloud Functions（Firebase Functions）でLINE Botをデプロイする手順です。

## 🎯 メリット

- ✅ **サーバーレス**: サーバー管理不要
- ✅ **自動スケーリング**: アクセス数に応じて自動で拡張
- ✅ **無料枠**: 月間125,000リクエストまで無料
- ✅ **高可用性**: Googleのインフラで稼働

## 📋 前提条件

- **Node.js 20以上**（18は2025年10月に廃止されました）
- Firebase CLIインストール済み
- Googleアカウント

## 🚀 セットアップ手順

### 1. Firebase CLIのインストール

```bash
npm install -g firebase-tools
```

**注意**: Node.js 20以上が必要です。バージョン確認：
```bash
node --version  # v20.x.x 以上であることを確認
```

### 2. Firebaseにログイン

```bash
firebase login
```

### 3. Firebaseプロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 「プロジェクトを追加」をクリック
3. プロジェクト名を入力（例: `line-bot-project`）
4. Googleアナリティクスは任意で設定
5. プロジェクトを作成

### 4. Realtime Databaseの有効化

1. Firebase Consoleで作成したプロジェクトを開く
2. 左メニューから「Realtime Database」を選択
3. 「データベースを作成」をクリック
4. ロケーション: `asia-southeast1`（シンガポール）を推奨
5. セキュリティルール: **テストモードで開始**を選択（後で変更）
6. 「有効にする」をクリック

### 5. セキュリティルールの設定

Realtime Databaseのルールを以下に変更：

```json
{
  "rules": {
    "users": {
      "$userId": {
        ".read": false,
        ".write": false
      }
    }
  }
}
```

**重要**: Firebase Functions（サーバー側）はAdmin権限で動作するため、クライアントからの直接アクセスは拒否します。

### 6. プロジェクトの初期化

```bash
# プロジェクトディレクトリに移動
cd /home/user/webapp

# Firebaseプロジェクトを設定
firebase use --add
# → 作成したプロジェクトを選択
# → エイリアス名を入力（例: default）
```

`.firebaserc`ファイルが自動生成されます。

### 7. 依存パッケージのインストール

```bash
cd functions
npm install
```

### 8. LINE設定の追加

Firebase Functionsで環境変数を設定：

```bash
# LINE Channel Access Token を設定
firebase functions:config:set line.access_token="YOUR_CHANNEL_ACCESS_TOKEN"

# LINE Channel Secret を設定
firebase functions:config:set line.secret="YOUR_CHANNEL_SECRET"

# 設定確認
firebase functions:config:get
```

**出力例:**
```json
{
  "line": {
    "access_token": "xxx",
    "secret": "xxx"
  }
}
```

### 9. デプロイ

```bash
# functionsディレクトリから戻る
cd ..

# デプロイ実行
firebase deploy --only functions
```

デプロイには数分かかります。完了すると以下のようなURLが表示されます：

```
✔  functions[lineWebhook(asia-northeast1)]: Successful create operation.
Function URL (lineWebhook): https://asia-northeast1-YOUR_PROJECT_ID.cloudfunctions.net/lineWebhook

✔  functions[register(asia-northeast1)]: Successful create operation.
Function URL (register): https://asia-northeast1-YOUR_PROJECT_ID.cloudfunctions.net/register

✔  functions[generateQr(asia-northeast1)]: Successful create operation.
Function URL (generateQr): https://asia-northeast1-YOUR_PROJECT_ID.cloudfunctions.net/generateQr
```

### 10. LINE Developers設定

1. [LINE Developers Console](https://developers.line.biz/console/) にアクセス
2. チャネル設定を開く
3. **Webhook URL** を設定:
   ```
   https://asia-northeast1-YOUR_PROJECT_ID.cloudfunctions.net/lineWebhook
   ```
4. **Webhookの利用**: ONに設定
5. **検証**ボタンをクリックして接続確認

### 11. 動作確認

#### QRコード生成ツールにアクセス

ブラウザで以下のURLを開く：
```
https://asia-northeast1-YOUR_PROJECT_ID.cloudfunctions.net/generateQr
```

#### LINE Botをテスト

1. LINE公式アカウントを友達追加
2. ウェルカムメッセージが届くことを確認
3. QRコード生成ツールでQRコードを作成
4. QRコードを読み取って登録
5. 「リスト」と送信して登録されたIDを確認

## 📊 料金について

### Firebase Functions（第2世代）

**無料枠（月間）:**
- 呼び出し: 200万回
- コンピューティング時間: 40万GB秒
- ネットワーク下り: 5GB

**LINE Bot程度の利用**であれば、ほぼ無料枠内で運用可能です。

### Realtime Database

**無料枠:**
- ストレージ: 1GB
- ダウンロード: 10GB/月
- 同時接続: 100

## 🛠️ よく使うコマンド

### ログ確認

**リアルタイムでログを監視:**
```bash
# 全てのFunctionsのログを表示
firebase functions:log

# 特定のFunctionのみ
firebase functions:log --only lineWebhook

# 最新100件のログを表示
firebase functions:log --limit 100
```

**Firebase Consoleでログ確認:**
1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. プロジェクトを開く
3. 左メニュー「Functions」→「ログ」タブ
4. または Google Cloud Console で詳細ログを確認

**ログの種類:**
- `=== Webhook Received ===` - Webhook受信時の全データ
- `👤 New follower` - 新規友達登録
- `💬 Message received` - メッセージ受信
- `📋 List command triggered` - リストコマンド実行
- `🔙 Postback received` - ボタン押下
- `🗑️ Delete action triggered` - 削除実行
- `=== Register Request ===` - ID登録リクエスト
- `✅ Successfully linked` - 登録成功
- `❌ Error` - エラー発生

### 設定確認

```bash
# 現在の環境変数を確認
firebase functions:config:get

# ローカルで環境変数を使用（開発用）
firebase functions:config:get > functions/.runtimeconfig.json
```

### ローカルエミュレータで動作確認

```bash
# エミュレータ起動
firebase emulators:start

# Functions: http://localhost:5001/YOUR_PROJECT_ID/asia-northeast1/lineWebhook
```

### 再デプロイ

```bash
# 全てのFunctionsを再デプロイ
firebase deploy --only functions

# 特定のFunctionだけをデプロイ
firebase deploy --only functions:lineWebhook
```

### Functions削除

```bash
# 特定のFunctionを削除
firebase functions:delete lineWebhook

# 全てのFunctionsを削除
firebase functions:delete --force
```

## 🔒 セキュリティ

### Realtime Databaseルール

本番環境では以下のルールを設定（推奨）：

```json
{
  "rules": {
    "users": {
      "$userId": {
        ".read": false,
        ".write": false
      }
    }
  }
}
```

Admin SDKのみがデータにアクセスできるようにします。

### 環境変数の管理

機密情報は**必ず** `firebase functions:config:set` で設定してください。

```bash
# ❌ 悪い例: コードに直接書く
const token = "YOUR_ACCESS_TOKEN";

# ✅ 良い例: 環境変数から取得
const token = functions.config().line.access_token;
```

## 🐛 トラブルシューティング

### デプロイエラー

#### Node.js 18 廃止エラー
```
Error: Runtime Node.js 18 was decommissioned on 2025-10-30
```

**解決方法:**
```bash
# Node.jsバージョン確認
node --version  # v20.x.x 以上であること

# Node.js 20をインストール（必要な場合）
# macOS/Linux: nvm use 20
# Windows: Node.js公式サイトからv20をダウンロード

# functions/package.json の engines.node を "20" に変更済み
```

#### その他のエラー
```bash
# Firebase CLIを最新に更新
npm install -g firebase-tools@latest

# プロジェクトの確認
firebase projects:list
```

### Webhook接続エラー

1. Firebase Consoleでログを確認
2. LINE Webhook URLが正しいか確認
3. Firebase FunctionsのCORSエラーがないか確認

### 環境変数が読み込めない

```bash
# 設定を再確認
firebase functions:config:get

# 再設定
firebase functions:config:set line.access_token="NEW_TOKEN"

# 再デプロイ
firebase deploy --only functions
```

### LINE User IDの取得方法

友達登録時にWebhookでLINE User IDをログに出力して確認：

```javascript
// functions/index.js に追加
if (event.type === "follow") {
  console.log("New follower:", event.source.userId);
  // ...
}
```

ログ確認：
```bash
firebase functions:log
```

## 📝 プロジェクト構造

```
webapp/
├── functions/
│   ├── index.js          # メインコード（全ての関数）
│   ├── package.json      # 依存パッケージ
│   └── .eslintrc.js      # ESLint設定
├── firebase.json         # Firebase設定
├── .firebaserc           # プロジェクトエイリアス
└── FIREBASE_SETUP.md     # このファイル
```

## 🔗 関連リンク

- [Firebase Console](https://console.firebase.google.com/)
- [Firebase Functions ドキュメント](https://firebase.google.com/docs/functions)
- [LINE Developers Console](https://developers.line.biz/console/)
- [LINE Messaging API](https://developers.line.biz/ja/docs/messaging-api/)

## 💡 Tips

### カスタムドメインの設定

Firebase Hostingを使ってカスタムドメインを設定できます：

```bash
firebase init hosting
firebase deploy --only hosting
```

### バックアップ

Realtime Databaseは自動バックアップされませんが、エクスポート機能があります：

```bash
# Firebase Consoleから手動エクスポート
# または Firebase Admin SDKを使って定期バックアップ
```

### モニタリング

Firebase Consoleで以下を確認できます：
- 関数の呼び出し回数
- エラー率
- 実行時間
- メモリ使用量

---

## ✅ チェックリスト

デプロイ前の確認：

- [ ] Firebaseプロジェクト作成済み
- [ ] Realtime Database有効化済み
- [ ] Firebase CLI インストール済み
- [ ] `firebase login` 実行済み
- [ ] `firebase use --add` でプロジェクト設定済み
- [ ] LINE設定（access_token, secret）追加済み
- [ ] `firebase deploy --only functions` 実行済み
- [ ] LINE Webhook URL設定済み
- [ ] 動作確認完了

全て完了したら本番運用可能です！🎉
