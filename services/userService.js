const { admin } = require('../config/firebase');

class UserService {
  constructor(db) {
    this.db = db;
    this.usersRef = db.ref('users');
  }

  /**
   * ユーザーIDとLINE IDを紐付け
   * @param {string} lineUserId - LINE User ID
   * @param {string} userId - 登録するユーザーID
   * @param {string} userName - ユーザー名
   * @returns {Promise<Object>}
   */
  async linkUser(lineUserId, userId, userName) {
    try {
      const timestamp = Date.now();
      const linkData = {
        userId: userId,
        userName: userName,
        linkedAt: timestamp,
      };

      // LINE IDに紐づくユーザー情報を取得
      const userSnapshot = await this.usersRef.child(lineUserId).once('value');
      const userData = userSnapshot.val() || { linkedUsers: {} };

      // 既に同じuserIdが登録されているかチェック
      const existingLinks = userData.linkedUsers || {};
      if (existingLinks[userId]) {
        return {
          success: false,
          error: 'このIDは既に登録されています',
        };
      }

      // 新しいリンクを追加
      userData.linkedUsers = userData.linkedUsers || {};
      userData.linkedUsers[userId] = linkData;
      userData.lastUpdated = timestamp;

      await this.usersRef.child(lineUserId).set(userData);

      return {
        success: true,
        data: linkData,
      };
    } catch (error) {
      console.error('Error linking user:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * LINE IDに紐づくユーザーリストを取得
   * @param {string} lineUserId - LINE User ID
   * @returns {Promise<Array>}
   */
  async getLinkedUsers(lineUserId) {
    try {
      const snapshot = await this.usersRef.child(lineUserId).once('value');
      const userData = snapshot.val();

      if (!userData || !userData.linkedUsers) {
        return [];
      }

      // オブジェクトを配列に変換
      return Object.entries(userData.linkedUsers).map(([userId, data]) => ({
        userId,
        userName: data.userName,
        linkedAt: data.linkedAt,
      }));
    } catch (error) {
      console.error('Error getting linked users:', error);
      return [];
    }
  }

  /**
   * 特定のユーザーIDとの紐付けを削除
   * @param {string} lineUserId - LINE User ID
   * @param {string} userId - 削除するユーザーID
   * @returns {Promise<Object>}
   */
  async unlinkUser(lineUserId, userId) {
    try {
      const userRef = this.usersRef.child(lineUserId).child('linkedUsers').child(userId);
      await userRef.remove();

      // 最終更新日時を更新
      await this.usersRef.child(lineUserId).child('lastUpdated').set(Date.now());

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error unlinking user:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 全てのリンクを削除
   * @param {string} lineUserId - LINE User ID
   * @returns {Promise<Object>}
   */
  async unlinkAllUsers(lineUserId) {
    try {
      await this.usersRef.child(lineUserId).remove();
      return {
        success: true,
      };
    } catch (error) {
      console.error('Error unlinking all users:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = UserService;
