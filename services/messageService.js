const { client } = require('../config/line');

class MessageService {
  /**
   * ウェルカムメッセージを送信
   * @param {string} userId - LINE User ID
   */
  async sendWelcomeMessage(userId) {
    const message = {
      type: 'text',
      text: 'ご登録ありがとうございます！\n\nQRコードを読み取ってIDを登録してください。\n\n【コマンド一覧】\n・リスト → 登録済みIDを表示\n・ヘルプ → 使い方を表示',
    };

    try {
      await client.pushMessage({
        to: userId,
        messages: [message],
      });
    } catch (error) {
      console.error('Error sending welcome message:', error);
    }
  }

  /**
   * ID登録完了メッセージを送信
   * @param {string} userId - LINE User ID
   * @param {string} registeredId - 登録されたID
   * @param {string} userName - ユーザー名
   */
  async sendRegistrationSuccess(userId, registeredId, userName) {
    const message = {
      type: 'text',
      text: `✅ 登録完了\n\nID: ${registeredId}\n氏名: ${userName}\n\nが登録されました。`,
    };

    try {
      await client.pushMessage({
        to: userId,
        messages: [message],
      });
    } catch (error) {
      console.error('Error sending registration success:', error);
    }
  }

  /**
   * 登録済みIDリストを表示
   * @param {string} userId - LINE User ID
   * @param {Array} linkedUsers - 紐付けられたユーザーリスト
   */
  async sendUserList(userId, linkedUsers) {
    if (linkedUsers.length === 0) {
      const message = {
        type: 'text',
        text: '登録されているIDはありません。\n\nQRコードを読み取って登録してください。',
      };
      await client.replyMessage({
        replyToken: userId,
        messages: [message],
      });
      return;
    }

    // Flex Messageでリストを作成
    const bubbles = linkedUsers.map((user) => ({
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: user.userName,
            weight: 'bold',
            size: 'lg',
            wrap: true,
          },
          {
            type: 'box',
            layout: 'baseline',
            margin: 'md',
            contents: [
              {
                type: 'text',
                text: 'ID:',
                size: 'sm',
                color: '#aaaaaa',
                flex: 0,
              },
              {
                type: 'text',
                text: user.userId,
                size: 'sm',
                color: '#666666',
                wrap: true,
                flex: 4,
              },
            ],
          },
          {
            type: 'text',
            text: new Date(user.linkedAt).toLocaleString('ja-JP'),
            size: 'xs',
            color: '#aaaaaa',
            margin: 'md',
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#ff6b6b',
            action: {
              type: 'postback',
              label: '削除',
              data: `action=delete&userId=${user.userId}`,
              displayText: `${user.userName} を削除`,
            },
          },
        ],
      },
    }));

    const message = {
      type: 'flex',
      altText: '登録済みIDリスト',
      contents: {
        type: 'carousel',
        contents: bubbles,
      },
    };

    try {
      await client.pushMessage({
        to: userId,
        messages: [message],
      });
    } catch (error) {
      console.error('Error sending user list:', error);
    }
  }

  /**
   * ヘルプメッセージを送信
   * @param {string} replyToken - Reply Token
   */
  async sendHelp(replyToken) {
    const message = {
      type: 'text',
      text: '【使い方】\n\n1️⃣ QRコードを読み取る\n登録用のQRコードを読み取ると、IDと氏名が自動で登録されます。\n\n2️⃣ リストを表示\n「リスト」と送信すると、登録済みのIDが表示されます。\n\n3️⃣ IDを削除\nリスト表示後、削除したいIDの「削除」ボタンをタップしてください。\n\n※ 1つのLINEアカウントに複数のIDを登録できます。',
    };

    try {
      await client.replyMessage({
        replyToken: replyToken,
        messages: [message],
      });
    } catch (error) {
      console.error('Error sending help:', error);
    }
  }

  /**
   * エラーメッセージを送信
   * @param {string} userId - LINE User ID
   * @param {string} errorText - エラーメッセージ
   */
  async sendError(userId, errorText) {
    const message = {
      type: 'text',
      text: `❌ エラー\n\n${errorText}`,
    };

    try {
      await client.pushMessage({
        to: userId,
        messages: [message],
      });
    } catch (error) {
      console.error('Error sending error message:', error);
    }
  }

  /**
   * 削除確認メッセージを送信
   * @param {string} userId - LINE User ID
   * @param {string} deletedUserName - 削除されたユーザー名
   */
  async sendDeletionSuccess(userId, deletedUserName) {
    const message = {
      type: 'text',
      text: `✅ 削除完了\n\n${deletedUserName} の登録を削除しました。`,
    };

    try {
      await client.pushMessage({
        to: userId,
        messages: [message],
      });
    } catch (error) {
      console.error('Error sending deletion success:', error);
    }
  }
}

module.exports = new MessageService();
