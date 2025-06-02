import { $console, onlyCallOnce } from '../_utils';

(function sukkaDisableAv1() {
  // Override video element canPlayType() function

  const logDefuseAv1 = () => {
    $console.info('[sukka-disable-av1] AV1 is disabled!');
  };

  ((origCanPlayType) => {
    // eslint-disable-next-line sukka/class-prototype -- override native method
    HTMLVideoElement.prototype.canPlayType = function (type) {
      if (type.includes('av01')) {
        onlyCallOnce(logDefuseAv1);
        return '';
      };
      return origCanPlayType.call(this, type);
    };
    // eslint-disable-next-line @typescript-eslint/unbound-method -- override native method
  })(HTMLVideoElement.prototype.canPlayType);

  ((origIsTypeSupported) => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- can be nullable
    if (origIsTypeSupported == null) return false;

    window.MediaSource.isTypeSupported = function (type) {
      if (type.includes('av01')) {
        onlyCallOnce(logDefuseAv1);
        return false;
      }
      return origIsTypeSupported.call(this, type);
    };
    // eslint-disable-next-line @typescript-eslint/unbound-method -- override native method
  })(window.MediaSource.isTypeSupported);
}());
