import { $console } from '../_utils';

/// sukka-defuse-service-worker.js
(function sukkaDefuseServiceWorker() {
  try {
    Object.defineProperty(navigator.serviceWorker, 'register', {
      value: (async (...args) => {
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          if (regs.length > 0) {
            $console.log('[sukka-defuse-service-worker] unregistering existing registrations:', regs);

            await Promise.all(regs.map(async reg => {
              const url = reg.active?.scriptURL ?? reg.installing?.scriptURL ?? reg.waiting?.scriptURL ?? 'unknown';
              const result = await reg.unregister();
              if (result) {
                $console.log('[sukka-defuse-service-worker] successfully unregister:', url, reg.scope, reg);
              } else {
                $console.warn('[sukka-defuse-service-worker] unfinished unregister:', url, reg.scope, reg);
              }
            }));

            $console.log('[sukka-defuse-service-worker] unregistered all existing registrations!');
          }
        } catch (e) {
          $console.error('[sukka-defuse-service-worker] error while unregistering existing registrations:', e);
        }

        $console.log('[sukka-defuse-service-worker] blocked service worker registration', args);
        // eslint-disable-next-line sukka/unicorn/error-message -- intentionally empty message
        throw new Error('');
      }) satisfies typeof navigator.serviceWorker.register // ensure the new method has the same type as the original
    });
  } catch (e) {
    if (typeof e === 'object' && e !== null && 'name' in e && e.name === 'SecurityError') {
      return;
    }
    $console.error('[sukka-defuse-service-worker] failed to defuse service worker:', e);
  }
})();
