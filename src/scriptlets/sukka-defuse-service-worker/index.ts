import { $console } from '../_utils';

/// sukka-defuse-service-worker.js
(function sukkaDefuseServiceWorker() {
  Object.defineProperty(navigator.serviceWorker, 'register', {
    value: ((...args) => {
      $console.log('[sukka-defuse-service-worker] blocked service worker registration', args);
      // eslint-disable-next-line sukka/unicorn/error-message -- intentionally empty message
      return Promise.reject(new Error(''));
    }) satisfies typeof navigator.serviceWorker.register // ensure the new method has the same type as the original
  });
}());
