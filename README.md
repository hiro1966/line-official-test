# LINE Bot - Firebase ユーザー登録システム

LINEの公式アカウントと連携し、QRコードを使ってユーザーIDと氏名を紐付けるシステムです。

## 🎯 機能

- ✅ LINE公式アカウントの友達登録
- ✅ QRコードによるID紐付け（1つのLINEアカウントに複数ID登録可能）
- ✅ 登録済みIDのリスト表示
- ✅ IDの削除機能
- ✅ Firebaseへのデータ保存

## 📋 システムフロー

### 1. 友達登録
```
ユーザー → LINE公式アカウントのQRコード → 友達登録
       ↓
  ウェルカムメッセージ送信
```

### 2. ID紐付け
```
ユーザー → ID紐付け用QRコード読み取り
       ↓
  登録用URL（パラメータ付き）にアクセス
       ↓
  Firebase Databaseに保存
       ↓
  LINEに登録完了通知
```

### 3. ID管理
```
ユーザー → 「リスト」と送信
       ↓
  登録済みIDを表示（Flex Message）
       ↓
  削除ボタンで個別削除可能
```

## 🚀 セットアップ

### 1. 必要な環境

- Node.js 18以上
- Firebase プロジェクト
- LINE Developers アカウント

### 2. LINE Messaging API設定

1. [LINE Developers Console](https://developers.line.biz/console/) にアクセス
2. 新規プロバイダーとチャネル（Messaging API）を作成
3. 以下の情報を取得：
   - Channel Secret
   - Channel Access Token

4. Webhook設定：
   - Webhook URL: `https://your-domain.com/webhook`
   - Webhookの利用: ON

### 3. Firebase設定

1. [Firebase Console](https://console.firebase.google.com/) でプロジェクト作成
2. Realtime Databaseを有効化
3. サービスアカウントキーを生成：
   - プロジェクト設定 → サービスアカウント → 新しい秘密鍵の生成

4. 取得した情報をメモ：
   - Project ID
   - Private Key
   - Client Email

### 4. 環境変数設定

`.env`ファイルを作成：

```bash
# LINE Messaging API設定
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token_here
LINE_CHANNEL_SECRET=your_channel_secret_here

# Firebase設定
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour_Private_Key_Here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your_client_email@your_project_id.iam.gserviceaccount.com

# サーバー設定
PORT=3000
BASE_URL=https://your-domain.com
```

### 5. インストールと起動

```bash
# 依存パッケージをインストール
npm install

# 開発モード（自動再起動）
npm run dev

# 本番モード
npm start
```

## 📱 使い方

### 管理者：QRコード生成

1. ブラウザで `https://your-domain.com/generate-qr` にアクセス
2. 以下を入力：
   - **LINE User ID**: ユーザーのLINE ID（Webhookで取得）
   - **登録ID**: 紐付けたいID（例: EMP001）
   - **氏名**: ユーザーの名前
3. 「QRコード生成」ボタンをクリック
4. 生成されたQRコードをダウンロード・配布

### ユーザー：登録と管理

#### 友達登録
1. LINE公式アカウントのQRコードを読み取る
2. 友達追加

#### ID登録
1. 配布されたID紐付け用QRコードを読み取る
2. 自動で登録完了

#### ID確認
LINEで「**リスト**」と送信

#### ID削除
1. 「リスト」でID一覧を表示
2. 削除したいIDの「削除」ボタンをタップ

#### ヘルプ
LINEで「**ヘルプ**」と送信

## 📊 データベース構造

```json
{
  "users": {
    "U1234567890abcdef": {
      "linkedUsers": {
        "EMP001": {
          "userId": "EMP001",
          "userName": "山田太郎",
          "linkedAt": 1699999999999
        },
        "EMP002": {
          "userId": "EMP002",
          "userName": "鈴木花子",
          "linkedAt": 1699999999999
        }
      },
      "lastUpdated": 1699999999999
    }
  }
}
```

## 🔌 API エンドポイント

### `GET /`
ヘルスチェック

**レスポンス:**
```json
{
  "status": "ok",
  "message": "LINE Bot API Server is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### `POST /webhook`
LINE Webhook エンドポイント

**イベントタイプ:**
- `follow`: 友達追加
- `message`: メッセージ受信
- `postback`: ボタンアクション

### `GET /register`
ID紐付け用エンドポイント

**パラメータ:**
- `lineId` (required): LINE User ID
- `userId` (required): 登録するID
- `userName` (required): ユーザー名

**例:**
```
https://your-domain.com/register?lineId=U1234...&userId=EMP001&userName=山田太郎
```

### `GET /generate-qr`
QRコード生成ツール（Web UI）

## 🛠️ 技術スタック

- **Backend**: Node.js + Express
- **LINE**: @line/bot-sdk
- **Database**: Firebase Realtime Database
- **QR Code**: qrcode.js

## 📁 プロジェクト構造

```
webapp/
├── config/
│   ├── firebase.js      # Firebase設定
│   └── line.js          # LINE SDK設定
├── services/
│   ├── userService.js   # ユーザー管理ロジック
│   └── messageService.js # LINEメッセージ送信
├── routes/
│   ├── webhook.js       # LINE Webhook処理
│   └── register.js      # ID登録処理
├── server.js            # メインサーバー
├── package.json
├── .env.example
└── README.md
```

## 🔒 セキュリティ

- LINE Webhook署名検証を実装
- Firebase Admin SDKによる安全な認証
- 環境変数による機密情報管理

## 🐛 トラブルシューティング

### Webhookが動作しない
1. LINE DevelopersコンソールでWebhook URLが正しく設定されているか確認
2. サーバーがHTTPSで公開されているか確認
3. Webhookの検証機能でテスト

### Firebaseエラー
1. `.env`のFirebase認証情報が正しいか確認
2. Realtime Databaseのルールを確認
3. サービスアカウントの権限を確認

### QRコードが読み取れない
1. QRコード生成時のURLが正しいか確認
2. BASE_URLが正しく設定されているか確認

## 📝 ライセンス

MIT

## 🤝 サポート

問題が発生した場合は、Issueを作成してください。
