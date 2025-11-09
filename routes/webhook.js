const express = require('express');
const line = require('@line/bot-sdk');
const { config } = require('../config/line');
const UserService = require('../services/userService');
const messageService = require('../services/messageService');

const router = express.Router();

// LINE Webhook設定
router.post('/', line.middleware(config), async (req, res) => {
  try {
    const events = req.body.events;
    
    // 各イベントを処理
    await Promise.all(events.map(handleEvent));
    
    res.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * イベントハンドラー
 * @param {Object} event - LINEイベント
 */
async function handleEvent(event) {
  const userService = new UserService(require('../server').getDatabase());

  // フォロー（友達追加）イベント
  if (event.type === 'follow') {
    await messageService.sendWelcomeMessage(event.source.userId);
    return;
  }

  // メッセージイベント
  if (event.type === 'message' && event.message.type === 'text') {
    const text = event.message.text.trim();
    const userId = event.source.userId;

    // 「リスト」コマンド
    if (text === 'リスト' || text === 'りすと' || text.toLowerCase() === 'list') {
      const linkedUsers = await userService.getLinkedUsers(userId);
      await messageService.sendUserList(userId, linkedUsers);
      return;
    }

    // 「ヘルプ」コマンド
    if (text === 'ヘルプ' || text === 'へるぷ' || text.toLowerCase() === 'help') {
      await messageService.sendHelp(event.replyToken);
      return;
    }

    // その他のテキストメッセージには使い方を案内
    await messageService.sendHelp(event.replyToken);
    return;
  }

  // ポストバックイベント（削除ボタンなど）
  if (event.type === 'postback') {
    const data = new URLSearchParams(event.postback.data);
    const action = data.get('action');
    const targetUserId = data.get('userId');
    const lineUserId = event.source.userId;

    if (action === 'delete' && targetUserId) {
      // ユーザー情報を取得してから削除
      const linkedUsers = await userService.getLinkedUsers(lineUserId);
      const targetUser = linkedUsers.find(u => u.userId === targetUserId);
      
      const result = await userService.unlinkUser(lineUserId, targetUserId);
      
      if (result.success) {
        await messageService.sendDeletionSuccess(
          lineUserId,
          targetUser ? targetUser.userName : targetUserId
        );
      } else {
        await messageService.sendError(lineUserId, '削除に失敗しました。');
      }
      return;
    }
  }
}

module.exports = router;
