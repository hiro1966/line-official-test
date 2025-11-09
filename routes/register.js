const express = require('express');
const UserService = require('../services/userService');
const messageService = require('../services/messageService');

const router = express.Router();

/**
 * ID紐付け用エンドポイント
 * QRコードからアクセスされるURL
 * 例: https://your-domain.com/register?lineId=U1234...&userId=ABC123&userName=山田太郎
 */
router.get('/', async (req, res) => {
  try {
    const { lineId, userId, userName } = req.query;

    // パラメータチェック
    if (!lineId || !userId || !userName) {
      return res.status(400).send(`
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
            <p>必要なパラメータが不足しています。<br>正しいQRコードをご使用ください。</p>
          </div>
        </body>
        </html>
      `);
    }

    // データベースに登録
    const userService = new UserService(require('../server').getDatabase());
    const result = await userService.linkUser(lineId, userId, userName);

    if (result.success) {
      // LINEに通知
      await messageService.sendRegistrationSuccess(lineId, userId, userName);

      // 成功ページを表示
      return res.send(`
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
      `);
    } else {
      // エラーページを表示
      return res.status(400).send(`
        <!DOCTYPE html>
        <html lang="ja">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>登録エラー</title>
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
            <div class="error-icon">⚠️</div>
            <h1>登録エラー</h1>
            <p>${result.error || '登録中にエラーが発生しました。'}</p>
          </div>
        </body>
        </html>
      `);
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>サーバーエラー</title>
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
          <div class="error-icon">💥</div>
          <h1>サーバーエラー</h1>
          <p>サーバーでエラーが発生しました。<br>しばらく経ってから再度お試しください。</p>
        </div>
      </body>
      </html>
    `);
  }
});

module.exports = router;
