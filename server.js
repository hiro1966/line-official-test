const express = require('express');
const { initFirebase } = require('./config/firebase');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Firebase初期化
let database;
try {
  database = initFirebase();
  console.log('✅ Database initialized');
} catch (error) {
  console.error('❌ Failed to initialize database:', error);
  process.exit(1);
}

// データベースを他のモジュールから取得できるようにする
module.exports.getDatabase = () => database;

// ミドルウェア
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ルート
const webhookRouter = require('./routes/webhook');
const registerRouter = require('./routes/register');

app.use('/webhook', webhookRouter);
app.use('/register', registerRouter);

// ヘルスチェック
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'LINE Bot API Server is running',
    timestamp: new Date().toISOString(),
  });
});

// QRコード生成ツール用のエンドポイント
app.get('/generate-qr', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>QRコード生成ツール</title>
      <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
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
        button:disabled {
          background: #ccc;
          cursor: not-allowed;
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
        #qrcode canvas {
          margin: 20px auto;
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
          <h3>⚠️ 重要</h3>
          <p>このツールで生成されたQRコードを読み取ると、指定したIDと氏名がLINEアカウントに紐付けられます。</p>
          <p><strong>LINE User ID</strong>は、ユーザーが友達登録した際にWebhookで取得できます。</p>
        </div>

        <form id="qrForm">
          <div class="form-group">
            <label for="lineId">LINE User ID *</label>
            <input 
              type="text" 
              id="lineId" 
              name="lineId" 
              placeholder="例: U1234567890abcdef1234567890abcdef"
              required
            >
          </div>

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
          <canvas id="canvas"></canvas>
          <div class="url-display" id="urlDisplay"></div>
          <button class="download-btn" onclick="downloadQR()">QRコードをダウンロード</button>
        </div>
      </div>

      <script>
        const form = document.getElementById('qrForm');
        const qrcodeDiv = document.getElementById('qrcode');
        const canvas = document.getElementById('canvas');
        const urlDisplay = document.getElementById('urlDisplay');
        const baseUrl = window.location.origin;

        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          
          const lineId = document.getElementById('lineId').value.trim();
          const userId = document.getElementById('userId').value.trim();
          const userName = document.getElementById('userName').value.trim();

          if (!lineId || !userId || !userName) {
            alert('全ての項目を入力してください');
            return;
          }

          // URL生成
          const url = baseUrl + '/register?' + 
            'lineId=' + encodeURIComponent(lineId) +
            '&userId=' + encodeURIComponent(userId) +
            '&userName=' + encodeURIComponent(userName);

          // QRコード生成
          try {
            await QRCode.toCanvas(canvas, url, {
              width: 300,
              margin: 2,
              color: {
                dark: '#000000',
                light: '#ffffff'
              }
            });

            urlDisplay.textContent = url;
            qrcodeDiv.classList.add('show');
          } catch (error) {
            console.error('QRコード生成エラー:', error);
            alert('QRコードの生成に失敗しました');
          }
        });

        function downloadQR() {
          const link = document.createElement('a');
          const userId = document.getElementById('userId').value.trim();
          const userName = document.getElementById('userName').value.trim();
          
          link.download = 'QR_' + userId + '_' + userName + '.png';
          link.href = canvas.toDataURL();
          link.click();
        }
      </script>
    </body>
    </html>
  `);
});

// エラーハンドリング
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
  });
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║   LINE Bot API Server                      ║
║   Port: ${PORT}                              ║
║   Status: ✅ Running                        ║
╚════════════════════════════════════════════╝

📍 Endpoints:
   - GET  /                 Health check
   - POST /webhook          LINE Webhook
   - GET  /register         User registration
   - GET  /generate-qr      QR code generator

🔧 Commands:
   - リスト    Display registered IDs
   - ヘルプ    Show help message
  `);
});
