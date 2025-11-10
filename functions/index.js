const functions = require("firebase-functions");
const admin = require("firebase-admin");
const line = require("@line/bot-sdk");

// Firebase Admin初期化
admin.initializeApp();
const db = admin.database();

// LINE設定
const config = {
  channelAccessToken: functions.config().line.access_token,
  channelSecret: functions.config().line.secret,
};

const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: config.channelAccessToken,
});

// ============================================
// ユーザーサービス
// ============================================
class UserService {
  /**
   * ユーザーIDとLINE IDを紐付け
   */
  static async linkUser(lineUserId, userId, userName) {
    try {
      console.log("🔗 UserService.linkUser called:", {lineUserId, userId, userName});

      const timestamp = Date.now();
      const linkData = {
        userId: userId,
        userName: userName,
        linkedAt: timestamp,
      };

      const userRef = db.ref(`users/${lineUserId}`);
      const snapshot = await userRef.once("value");
      const userData = snapshot.val() || {linkedUsers: {}};

      console.log("📊 Current user data:", JSON.stringify(userData, null, 2));

      // 既に同じuserIdが登録されているかチェック
      if (userData.linkedUsers && userData.linkedUsers[userId]) {
        console.log("⚠️ User ID already exists:", userId);
        return {
          success: false,
          error: "このIDは既に登録されています",
        };
      }

      // 新しいリンクを追加
      userData.linkedUsers = userData.linkedUsers || {};
      userData.linkedUsers[userId] = linkData;
      userData.lastUpdated = timestamp;

      console.log("💾 Saving to database...");
      await userRef.set(userData);
      console.log("✅ Successfully saved to database");

      return {
        success: true,
        data: linkData,
      };
    } catch (error) {
      console.error("❌ Error linking user:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * LINE IDに紐づくユーザーリストを取得
   */
  static async getLinkedUsers(lineUserId) {
    try {
      console.log("📖 UserService.getLinkedUsers called for:", lineUserId);

      const snapshot = await db.ref(`users/${lineUserId}`).once("value");
      const userData = snapshot.val();

      if (!userData || !userData.linkedUsers) {
        console.log("ℹ️ No linked users found");
        return [];
      }

      const linkedUsers = Object.entries(userData.linkedUsers).map(([userId, data]) => ({
        userId,
        userName: data.userName,
        linkedAt: data.linkedAt,
      }));

      console.log("✅ Found", linkedUsers.length, "linked users");
      return linkedUsers;
    } catch (error) {
      console.error("❌ Error getting linked users:", error);
      return [];
    }
  }

  /**
   * 特定のユーザーIDとの紐付けを削除
   */
  static async unlinkUser(lineUserId, userId) {
    try {
      console.log("🗑️ UserService.unlinkUser called:", {lineUserId, userId});

      await db.ref(`users/${lineUserId}/linkedUsers/${userId}`).remove();
      await db.ref(`users/${lineUserId}/lastUpdated`).set(Date.now());

      console.log("✅ Successfully unlinked:", userId);
      return {success: true};
    } catch (error) {
      console.error("❌ Error unlinking user:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// ============================================
// メッセージサービス
// ============================================
class MessageService {
  /**
   * ウェルカムメッセージを送信
   */
  static async sendWelcomeMessage(userId) {
    const message = {
      type: "text",
      text: "ご登録ありがとうございます！\n\n" +
        "QRコードを読み取ってIDを登録してください。\n\n" +
        "【コマンド一覧】\n" +
        "・リスト → 登録済みIDを表示\n" +
        "・ヘルプ → 使い方を表示",
    };

    try {
      await client.pushMessage({
        to: userId,
        messages: [message],
      });
    } catch (error) {
      console.error("Error sending welcome message:", error);
    }
  }

  /**
   * ID登録完了メッセージを送信
   */
  static async sendRegistrationSuccess(userId, registeredId, userName) {
    const message = {
      type: "text",
      text: `✅ 登録完了\n\nID: ${registeredId}\n氏名: ${userName}\n\n` +
        "が登録されました。",
    };

    try {
      await client.pushMessage({
        to: userId,
        messages: [message],
      });
    } catch (error) {
      console.error("Error sending registration success:", error);
    }
  }

  /**
   * 登録済みIDリストを表示
   */
  static async sendUserList(userId, linkedUsers) {
    if (linkedUsers.length === 0) {
      const message = {
        type: "text",
        text: "登録されているIDはありません。\n\n" +
          "QRコードを読み取って登録してください。",
      };
      await client.pushMessage({
        to: userId,
        messages: [message],
      });
      return;
    }

    // Flex Messageでリストを作成
    const bubbles = linkedUsers.map((user) => ({
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: user.userName,
            weight: "bold",
            size: "lg",
            wrap: true,
          },
          {
            type: "box",
            layout: "baseline",
            margin: "md",
            contents: [
              {
                type: "text",
                text: "ID:",
                size: "sm",
                color: "#aaaaaa",
                flex: 0,
              },
              {
                type: "text",
                text: user.userId,
                size: "sm",
                color: "#666666",
                wrap: true,
                flex: 4,
              },
            ],
          },
          {
            type: "text",
            text: new Date(user.linkedAt).toLocaleString("ja-JP"),
            size: "xs",
            color: "#aaaaaa",
            margin: "md",
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#ff6b6b",
            action: {
              type: "postback",
              label: "削除",
              data: `action=delete&userId=${user.userId}`,
              displayText: `${user.userName} を削除`,
            },
          },
        ],
      },
    }));

    const message = {
      type: "flex",
      altText: "登録済みIDリスト",
      contents: {
        type: "carousel",
        contents: bubbles,
      },
    };

    try {
      await client.pushMessage({
        to: userId,
        messages: [message],
      });
    } catch (error) {
      console.error("Error sending user list:", error);
    }
  }

  /**
   * ヘルプメッセージを送信
   */
  static async sendHelp(replyToken) {
    const message = {
      type: "text",
      text: "【使い方】\n\n" +
        "1️⃣ QRコードを読み取る\n" +
        "登録用のQRコードを読み取ると、IDと氏名が自動で登録されます。\n\n" +
        "2️⃣ リストを表示\n" +
        "「リスト」と送信すると、登録済みのIDが表示されます。\n\n" +
        "3️⃣ IDを削除\n" +
        "リスト表示後、削除したいIDの「削除」ボタンをタップしてください。\n\n" +
        "※ 1つのLINEアカウントに複数のIDを登録できます。",
    };

    try {
      await client.replyMessage({
        replyToken: replyToken,
        messages: [message],
      });
    } catch (error) {
      console.error("Error sending help:", error);
    }
  }

  /**
   * 削除確認メッセージを送信
   */
  static async sendDeletionSuccess(userId, deletedUserName) {
    const message = {
      type: "text",
      text: `✅ 削除完了\n\n${deletedUserName} の登録を削除しました。`,
    };

    try {
      await client.pushMessage({
        to: userId,
        messages: [message],
      });
    } catch (error) {
      console.error("Error sending deletion success:", error);
    }
  }

  /**
   * エラーメッセージを送信
   */
  static async sendError(userId, errorText) {
    const message = {
      type: "text",
      text: `❌ エラー\n\n${errorText}`,
    };

    try {
      await client.pushMessage({
        to: userId,
        messages: [message],
      });
    } catch (error) {
      console.error("Error sending error message:", error);
    }
  }
}

// ============================================
// Cloud Functions
// ============================================

/**
 * LINE Webhook
 */
exports.lineWebhook = functions.region("asia-northeast1").https.onRequest(
    async (req, res) => {
      // LINE署名検証
      const signature = req.get("x-line-signature");
      if (!signature) {
        return res.status(401).send("Unauthorized");
      }

      // POST以外は拒否
      if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
      }

      try {
        // 📝 受信した全データをログ出力
        console.log("=== Webhook Received ===");
        console.log("Headers:", JSON.stringify(req.headers, null, 2));
        console.log("Body:", JSON.stringify(req.body, null, 2));
        console.log("========================");

        const events = req.body.events;

        // 各イベントを処理
        await Promise.all(events.map(handleEvent));

        res.json({success: true});
      } catch (error) {
        console.error("❌ Webhook error:", error);
        res.status(500).json({error: error.message});
      }
    },
);

/**
 * イベントハンドラー
 */
async function handleEvent(event) {
  // 📝 イベント詳細をログ出力
  console.log("--- Event Handler ---");
  console.log("Event Type:", event.type);
  console.log("Event Data:", JSON.stringify(event, null, 2));
  console.log("--------------------");

  // フォロー（友達追加）イベント
  if (event.type === "follow") {
    console.log("👤 New follower:", event.source.userId);
    await MessageService.sendWelcomeMessage(event.source.userId);
    return;
  }

  // メッセージイベント
  if (event.type === "message" && event.message.type === "text") {
    const text = event.message.text.trim();
    const lineUserId = event.source.userId;

    console.log("💬 Message received:", text, "from:", lineUserId);

    // 「登録:ID:氏名」形式のメッセージ（QRコードからの登録）
    if (text.startsWith("登録:")) {
      const parts = text.split(":");
      if (parts.length === 3) {
        const userId = parts[1].trim();
        const userName = parts[2].trim();

        console.log("📝 Registration message detected:", {userId, userName});

        const result = await UserService.linkUser(lineUserId, userId, userName);

        if (result.success) {
          await MessageService.sendRegistrationSuccess(lineUserId, userId, userName);
        } else {
          await MessageService.sendError(lineUserId, result.error);
        }
        return;
      }
    }

    // 「リスト」コマンド
    if (text === "リスト" || text === "りすと" || text.toLowerCase() === "list") {
      console.log("📋 List command triggered");
      const linkedUsers = await UserService.getLinkedUsers(lineUserId);
      console.log("📊 Found", linkedUsers.length, "linked users");
      await MessageService.sendUserList(lineUserId, linkedUsers);
      return;
    }

    // 「ヘルプ」コマンド
    if (text === "ヘルプ" || text === "へるぷ" || text.toLowerCase() === "help") {
      console.log("❓ Help command triggered");
      await MessageService.sendHelp(event.replyToken);
      return;
    }

    // その他のテキストメッセージには使い方を案内
    console.log("ℹ️ Unknown command, sending help");
    await MessageService.sendHelp(event.replyToken);
    return;
  }

  // ポストバックイベント（削除ボタンなど）
  if (event.type === "postback") {
    const data = new URLSearchParams(event.postback.data);
    const action = data.get("action");
    const targetUserId = data.get("userId");
    const lineUserId = event.source.userId;

    console.log("🔙 Postback received - Action:", action, "UserID:", targetUserId);

    if (action === "delete" && targetUserId) {
      console.log("🗑️ Delete action triggered for:", targetUserId);

      // ユーザー情報を取得してから削除
      const linkedUsers = await UserService.getLinkedUsers(lineUserId);
      const targetUser = linkedUsers.find((u) => u.userId === targetUserId);

      const result = await UserService.unlinkUser(lineUserId, targetUserId);

      if (result.success) {
        console.log("✅ Successfully deleted:", targetUserId);
        await MessageService.sendDeletionSuccess(
            lineUserId,
            targetUser ? targetUser.userName : targetUserId,
        );
      } else {
        console.log("❌ Failed to delete:", targetUserId, "Error:", result.error);
        await MessageService.sendError(lineUserId, "削除に失敗しました。");
      }
      return;
    }
  }

  // その他のイベント
  console.log("⚠️ Unhandled event type:", event.type);
}

/**
 * QRコード読み取り後のリンクページ（LINEメッセージ送信を促す）
 */
exports.link = functions.region("asia-northeast1").https.onRequest(
    async (req, res) => {
      try {
        const {userId, userName} = req.query;

        console.log("=== Link Page Accessed ===");
        console.log("Query params:", JSON.stringify(req.query, null, 2));
        console.log("=========================");

        // パラメータチェック
        if (!userId || !userName) {
          return res.status(400).send(generateErrorPage(
              "必要なパラメータが不足しています。<br>" +
            "正しいQRコードをご使用ください。",
          ));
        }

        // LINEトークを開くURL（登録コードを自動入力）
        const lineUrl = `https://line.me/R/oaMessage/@YOUR_LINE_ID/?登録:${userId}:${userName}`;

        // リンクページを表示
        return res.send(`
          <!DOCTYPE html>
          <html lang="ja">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>LINE登録</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              }
              .container {
                background: white;
                padding: 40px;
                border-radius: 20px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                text-align: center;
                max-width: 400px;
              }
              h1 {
                color: #333;
                margin: 0 0 20px 0;
              }
              .info {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 10px;
                margin: 20px 0;
                text-align: left;
              }
              .info-row {
                display: flex;
                margin: 10px 0;
                font-size: 14px;
              }
              .info-label {
                font-weight: bold;
                color: #666;
                min-width: 50px;
              }
              .info-value {
                color: #333;
                word-break: break-all;
              }
              .instructions {
                background: #e3f2fd;
                border-left: 4px solid #2196f3;
                padding: 15px;
                margin: 20px 0;
                text-align: left;
                border-radius: 5px;
              }
              .instructions ol {
                margin: 10px 0;
                padding-left: 20px;
              }
              .instructions li {
                margin: 8px 0;
                line-height: 1.6;
              }
              .code-display {
                background: #f5f5f5;
                padding: 15px;
                border-radius: 5px;
                font-family: monospace;
                font-size: 18px;
                font-weight: bold;
                color: #06c755;
                margin: 20px 0;
                border: 2px dashed #06c755;
              }
              .line-button {
                display: inline-block;
                background: #06c755;
                color: white;
                padding: 15px 40px;
                border-radius: 25px;
                text-decoration: none;
                margin-top: 20px;
                font-weight: bold;
                font-size: 18px;
              }
              .line-button:hover {
                background: #05b048;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>📱 LINE登録</h1>
              <div class="info">
                <div class="info-row">
                  <span class="info-label">ID:</span>
                  <span class="info-value">${userId}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">氏名:</span>
                  <span class="info-value">${userName}</span>
                </div>
              </div>
              
              <div class="instructions">
                <strong>📝 登録手順:</strong>
                <ol>
                  <li>まず、LINE公式アカウントを友達追加</li>
                  <li>下のボタンをタップしてLINEを開く</li>
                  <li>以下のコードをコピーして送信:</li>
                </ol>
              </div>

              <div class="code-display">
                登録:${userId}:${userName}
              </div>

              <a href="https://line.me/R/" class="line-button">LINEを開く</a>
            </div>
          </body>
          </html>
        `);
      } catch (error) {
        console.error("❌ Link page error:", error);
        res.status(500).send(generateErrorPage(
            "サーバーでエラーが発生しました。<br>" +
          "しばらく経ってから再度お試しください。",
        ));
      }
    },
);

/**
 * ID紐付け用エンドポイント（旧バージョン・互換性維持）
 */
exports.register = functions.region("asia-northeast1").https.onRequest(
    async (req, res) => {
      try {
        console.log("=== Register Request ===");
        console.log("Query params:", JSON.stringify(req.query, null, 2));
        console.log("========================");

        const {lineId, userId, userName} = req.query;

        // パラメータチェック
        if (!lineId || !userId || !userName) {
          console.log("❌ Missing parameters");
          return res.status(400).send(generateErrorPage(
              "必要なパラメータが不足しています。<br>" +
            "正しいQRコードをご使用ください。",
          ));
        }

        console.log("📝 Attempting to link:", {lineId, userId, userName});

        // データベースに登録
        const result = await UserService.linkUser(lineId, userId, userName);

        if (result.success) {
          console.log("✅ Successfully linked:", userId, "to", lineId);

          // LINEに通知
          await MessageService.sendRegistrationSuccess(lineId, userId, userName);

          // 成功ページを表示
          return res.send(generateSuccessPage(userId, userName));
        } else {
          console.log("❌ Failed to link:", result.error);
          // エラーページを表示
          return res.status(400).send(generateErrorPage(
              result.error || "登録中にエラーが発生しました。",
          ));
        }
      } catch (error) {
        console.error("❌ Registration error:", error);
        res.status(500).send(generateErrorPage(
            "サーバーでエラーが発生しました。<br>" +
          "しばらく経ってから再度お試しください。",
        ));
      }
    },
);

/**
 * QRコード生成ツール
 */
exports.generateQr = functions.region("asia-northeast1").https.onRequest(
    (req, res) => {
      const functionUrl = `https://asia-northeast1-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/link`;

      res.send(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>QRコード生成ツール</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          max-width: 800px;
          margin: 50px auto;
          padding: 20px;
          background: #f5f5f5;
        }
        .container {
          background: white;
          padding: 40px;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
          color: #333;
          border-bottom: 3px solid #06c755;
          padding-bottom: 10px;
        }
        .form-group {
          margin: 20px 0;
        }
        label {
          display: block;
          font-weight: bold;
          margin-bottom: 5px;
          color: #555;
        }
        input {
          width: 100%;
          padding: 12px;
          border: 2px solid #ddd;
          border-radius: 5px;
          font-size: 16px;
          box-sizing: border-box;
        }
        input:focus {
          outline: none;
          border-color: #06c755;
        }
        button {
          background: #06c755;
          color: white;
          padding: 15px 30px;
          border: none;
          border-radius: 5px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          width: 100%;
          margin-top: 10px;
        }
        button:hover {
          background: #05b048;
        }
        #qrcode {
          text-align: center;
          margin: 30px 0;
          padding: 20px;
          background: #f9f9f9;
          border-radius: 10px;
          display: none;
        }
        #qrcode.show {
          display: block;
        }
        #canvas {
          margin: 20px auto;
          display: flex;
          justify-content: center;
        }
        #canvas canvas,
        #canvas img {
          display: block;
        }
        .url-display {
          margin: 20px 0;
          padding: 15px;
          background: #f0f0f0;
          border-radius: 5px;
          word-break: break-all;
          font-family: monospace;
          font-size: 12px;
        }
        .note {
          background: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px;
          margin: 20px 0;
          border-radius: 5px;
        }
        .note h3 {
          margin-top: 0;
          color: #856404;
        }
        .download-btn {
          background: #007bff;
          margin-top: 10px;
        }
        .download-btn:hover {
          background: #0056b3;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>📱 LINE ID紐付け用QRコード生成</h1>
        
        <div class="note">
          <h3>💡 使い方</h3>
          <p>1. 登録IDと氏名を入力してQRコードを生成</p>
          <p>2. ユーザーがQRコードを読み取り、LINEでメッセージを送信</p>
          <p>3. 自動的にLINEアカウントとIDが紐付けられます</p>
        </div>

        <form id="qrForm">
          <div class="form-group">
            <label for="userId">登録ID *</label>
            <input 
              type="text" 
              id="userId" 
              name="userId" 
              placeholder="例: EMP001, STU12345"
              required
            >
          </div>

          <div class="form-group">
            <label for="userName">氏名 *</label>
            <input 
              type="text" 
              id="userName" 
              name="userName" 
              placeholder="例: 山田太郎"
              required
            >
          </div>

          <button type="submit">QRコード生成</button>
        </form>

        <div id="qrcode">
          <h2>生成されたQRコード</h2>
          <div id="canvas"></div>
          <div class="url-display" id="urlDisplay"></div>
          <button class="download-btn" onclick="downloadQR()">QRコードをダウンロード</button>
        </div>
      </div>

      <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
      <script>
        const form = document.getElementById('qrForm');
        const qrcodeDiv = document.getElementById('qrcode');
        const urlDisplay = document.getElementById('urlDisplay');
        const baseUrl = '${functionUrl}';
        let qrCodeInstance = null;

        form.addEventListener('submit', (e) => {
          e.preventDefault();
          
          const userId = document.getElementById('userId').value.trim();
          const userName = document.getElementById('userName').value.trim();

          if (!userId || !userName) {
            alert('全ての項目を入力してください');
            return;
          }

          // URL生成
          const url = baseUrl + '?' + 
            'userId=' + encodeURIComponent(userId) +
            '&userName=' + encodeURIComponent(userName);

          // 既存のQRコードをクリア
          const canvas = document.getElementById('canvas');
          if (canvas) {
            canvas.innerHTML = '';
          }

          // QRコード生成
          try {
            qrCodeInstance = new QRCode(document.getElementById('canvas'), {
              text: url,
              width: 300,
              height: 300,
              colorDark: '#000000',
              colorLight: '#ffffff',
              correctLevel: QRCode.CorrectLevel.H
            });

            urlDisplay.textContent = url;
            qrcodeDiv.classList.add('show');
          } catch (error) {
            console.error('QRコード生成エラー:', error);
            alert('QRコードの生成に失敗しました: ' + error.message);
          }
        });

        function downloadQR() {
          const canvas = document.querySelector('#canvas canvas');
          if (!canvas) {
            alert('QRコードが生成されていません');
            return;
          }

          const userId = document.getElementById('userId').value.trim();
          const userName = document.getElementById('userName').value.trim();
          
          const link = document.createElement('a');
          link.download = 'QR_' + userId + '_' + userName + '.png';
          link.href = canvas.toDataURL('image/png');
          link.click();
        }
      </script>
    </body>
    </html>
  `);
    },
);

// ============================================
// HTMLテンプレート生成関数
// ============================================

/**
 * 成功ページ生成
 */
function generateSuccessPage(userId, userName) {
  return `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>登録完了</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .container {
          background: white;
          padding: 40px;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          text-align: center;
          max-width: 400px;
          animation: slideIn 0.5s ease-out;
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .success-icon {
          font-size: 80px;
          margin-bottom: 20px;
          animation: bounce 0.6s ease-in-out;
        }
        @keyframes bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
        h1 {
          color: #27ae60;
          margin: 0 0 20px 0;
        }
        .info {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 10px;
          margin: 20px 0;
          text-align: left;
        }
        .info-row {
          display: flex;
          margin: 10px 0;
          font-size: 14px;
        }
        .info-label {
          font-weight: bold;
          color: #666;
          min-width: 50px;
        }
        .info-value {
          color: #333;
          word-break: break-all;
        }
        .note {
          color: #666;
          font-size: 14px;
          line-height: 1.6;
          margin-top: 20px;
        }
        .line-button {
          display: inline-block;
          background: #06c755;
          color: white;
          padding: 12px 30px;
          border-radius: 25px;
          text-decoration: none;
          margin-top: 20px;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="success-icon">✅</div>
        <h1>登録完了</h1>
        <div class="info">
          <div class="info-row">
            <span class="info-label">ID:</span>
            <span class="info-value">${userId}</span>
          </div>
          <div class="info-row">
            <span class="info-label">氏名:</span>
            <span class="info-value">${userName}</span>
          </div>
        </div>
        <p class="note">
          IDの登録が完了しました。<br>
          LINEにメッセージが届いています。<br>
          このページは閉じていただいて構いません。
        </p>
        <a href="https://line.me/R/" class="line-button">LINEを開く</a>
      </div>
    </body>
    </html>
  `;
}

/**
 * エラーページ生成
 */
function generateErrorPage(errorMessage) {
  return `
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>エラー</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .container {
          background: white;
          padding: 40px;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          text-align: center;
          max-width: 400px;
        }
        .error-icon {
          font-size: 60px;
          margin-bottom: 20px;
        }
        h1 {
          color: #e74c3c;
          margin: 0 0 20px 0;
        }
        p {
          color: #666;
          line-height: 1.6;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="error-icon">❌</div>
        <h1>エラー</h1>
        <p>${errorMessage}</p>
      </div>
    </body>
    </html>
  `;
}
