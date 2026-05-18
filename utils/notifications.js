const admin = require('../config/firebase');

/**
 * Send a push notification to a user
 * @param {string} pushToken - The recipient's FCM or Expo push token
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Optional data to send with the notification
 */
const sendNotification = async (pushToken, title, body, data = {}) => {
  if (!pushToken) return;

  try {
    // If it's a Firebase Admin initialized app and the token looks like an FCM token
    // (Note: In Expo, tokens can be Expo tokens or FCM tokens depending on config)
    // Here we try to send via Firebase if initialized correctly.
    
    if (admin.apps.length > 0) {
      const message = {
        notification: {
          title,
          body,
        },
        data: {
          ...data,
          click_action: 'FLUTTER_NOTIFICATION_CLICK', // Common for mobile apps
        },
        token: pushToken,
      };

      const response = await admin.messaging().send(message);
      console.log('Successfully sent Firebase message:', response);
      return response;
    } else {
      console.warn('Firebase Admin not initialized. Falling back to alternative methods if available.');
    }
  } catch (error) {
    console.error('Error sending Firebase notification:', error.message);
    
    // Fallback or specific error handling can go here
    // For example, if it's an Expo token, you might need to use the Expo API instead
  }
};

module.exports = { sendNotification };
