import { PushNotifications, PushNotificationSchema, Token, ActionPerformed } from '@capacitor/push-notifications';

const API_BASE = 'https://openbase.work';

async function registerDeviceToken(token: string) {
  try {
    const res = await fetch(`${API_BASE}/api/devices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ token, platform: 'android' }),
    });

    const text = await res.text();
    console.log('[push] /api/devices status', res.status);
    console.log('[push] /api/devices body', text);

    if (!res.ok) {
      console.warn('[push] Failed to register device token');
    }
  } catch (err) {
    console.error('[push] Error calling /api/devices', err);
  }
}

export async function setupPushNotifications() {
  console.log('[push] Initializing push notifications');

  let permStatus = await PushNotifications.checkPermissions();
  console.log('[push] Current permission status', permStatus);

  if (permStatus.receive !== 'granted') {
    permStatus = await PushNotifications.requestPermissions();
    console.log('[push] Request permission result', permStatus);
  }

  if (permStatus.receive !== 'granted') {
    console.warn('[push] Push permission not granted');
    return;
  }

  await PushNotifications.register();

  PushNotifications.addListener('registration', async (token: Token) => {
    console.log('[push] Registration token', token.value);
    await registerDeviceToken(token.value);
  });

  PushNotifications.addListener('registrationError', (error) => {
    console.error('[push] Registration error', error);
  });

  PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
    console.log('[push] Notification received', JSON.stringify(notification));
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
    console.log('[push] Notification action performed', JSON.stringify(action));
  });
}
