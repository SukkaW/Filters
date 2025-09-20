import { $console } from '../_utils';

/// sukka-defuse-service-worker.js
(function sukkaDefuseServiceWorker() {
  Object.defineProperty(navigator.serviceWorker, 'register', {
    value: (async (...args) => {
      $console.log('[sukka-defuse-service-worker] blocked service worker registration', args);

      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        if (regs.length > 0) {
          $console.log('[sukka-defuse-service-worker] unregistering existing registrations:', regs);

          for (const reg of regs) {
            const url = reg.active?.scriptURL ?? reg.installing?.scriptURL ?? reg.waiting?.scriptURL ?? 'unknown';
            // eslint-disable-next-line no-await-in-loop -- let's do this one by one
            if (await reg.unregister()) {
              $console.log('[sukka-defuse-service-worker] successfully unregister:', url, reg.scope, reg);
            } else {
              $console.log('[sukka-defuse-service-worker] unfinished unregister:', url, reg.scope, reg);
            }
          }
          await Promise.all(regs.map(reg => reg.unregister()));

          $console.log('[sukka-defuse-service-worker] unregistered all existing registrations!');
        }
      } catch (e) {
        $console.error('[sukka-defuse-service-worker] error while unregistering existing registrations:', e);
      }

      // eslint-disable-next-line sukka/unicorn/error-message -- intentionally empty message
      throw new Error('');
    }) satisfies typeof navigator.serviceWorker.register // ensure the new method has the same type as the original
  });
}());
