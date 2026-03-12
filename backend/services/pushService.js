const webpush = require('web-push');

// Initialize Web Push
let initialized = false;

function init() {
    const publicVapidKey = process.env.VAPID_PUBLIC_KEY;
    const privateVapidKey = process.env.VAPID_PRIVATE_KEY;

    if (!publicVapidKey || !privateVapidKey) {
        console.warn('VAPID keys not configured, push notifications disabled');
        return false;
    }

    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:admin@mcclostandfound.com',
        publicVapidKey,
        privateVapidKey
    );

    initialized = true;
    return true;
}

/**
 * Send a push notification to a user
 * @param {Object} subscription - Custom push subscription object from User model
 * @param {Object} payload - Notification payload { title, body, icon, url }
 */
async function sendNotification(subscription, payload = {}) {
    if (!initialized) {
        if (!init()) return false;
    }

    if (!subscription || !subscription.endpoint) {
        return false;
    }

    try {
        const defaultPayload = {
            title: 'MCC Lost & Found',
            body: 'You have a new update.',
            icon: '/placeholder-logo.png',
            url: '/'
        };

        const finalPayload = { ...defaultPayload, ...payload };

        await webpush.sendNotification(
            subscription,
            JSON.stringify(finalPayload)
        );
        return true;
    } catch (error) {
        console.error('Error sending push notification:', error);
        // If status 410 or 404, the subscription has expired or is invalid
        if (error.statusCode === 410 || error.statusCode === 404) {
            console.warn('Push subscription has expired or is no longer valid');
            return false; // Can be used to trigger deletion from user document
        }
        return false;
    }
}

module.exports = {
    sendNotification
};
