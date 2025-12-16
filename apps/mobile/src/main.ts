import { Capacitor } from '@capacitor/core';
import { setupPushNotifications } from './push-setup';

(async () => {
  // Only attempt push setup on native Android
  if (Capacitor.getPlatform() === 'android') {
    try {
      await setupPushNotifications();
    } catch (e) {
      console.error('[push] setupPushNotifications failed', e);
    }
  } else {
    console.log('[push] Push setup skipped for platform', Capacitor.getPlatform());
  }
})();
