import picocolors from 'picocolors';
import undici, {
  interceptors,
  Agent
} from 'undici';

import type {
  Dispatcher,
  Response,
  RequestInit
} from 'undici';

export type UndiciResponseData<T = unknown> = Dispatcher.ResponseData<T>;

import { inspect } from 'node:util';
import { isAbortErrorLike } from 'foxts/abort-error';

const agent = new Agent({ allowH2: true }).compose(
  interceptors.dns({
    // disable IPv6
    dualStack: false,
    affinity: 4
    // TODO: proper cacheable-lookup, or even DoH
  }),
  interceptors.retry({
    maxRetries: 5,
    minTimeout: 500, // The initial retry delay in milliseconds
    maxTimeout: 10 * 1000, // The maximum retry delay in milliseconds
    retryAfter: true,
    // Undici still uses `statusCodes` as the first gate for HTTP response retries.
    // Our custom `retry()` callback only runs after a response status is admitted here,
    // so we must list our status codes here before we can read it in our retry callback.
    statusCodes: [404, 429, 500, 502, 503, 504],
    // TODO: this part of code is only for allow more errors to be retried by default
    // This should be removed once https://github.com/nodejs/undici/issues/3728 is implemented
    retry(err, { state, opts }, cb) {
      const errorCode = 'code' in err ? (err as NodeJS.ErrnoException).code : undefined;

      // Any code that is not a Undici's originated and allowed to retry
      if (
        errorCode === 'ERR_UNESCAPED_CHARACTERS'
        || err.message === 'Request path contains unescaped characters'
        || err.name === 'AbortError'
      ) {
        return cb(err);
      }

      const statusCode = 'statusCode' in err && typeof err.statusCode === 'number' ? err.statusCode : null;

      // bail out if the status code matches one of the following
      if (
        statusCode != null
        && (
          statusCode === 401 // Unauthorized, should check credentials instead of retrying
          || statusCode === 403 // Forbidden, should check permissions instead of retrying
          || statusCode === 405 // Method Not Allowed, should check method instead of retrying
        )
      ) {
        return cb(err);
      }

      const origin = opts.origin?.toString();
      if (statusCode === 404) {
        if (origin?.includes('cdn.jsdelivr.net')) {
          // continue retry anyway, jsDelivr has recently broken and return HTTP 404 for bad origin
        } else {
          return cb(err);
        }
      }

      // if (errorCode === 'UND_ERR_REQ_RETRY') {
      //   return cb(err);
      // }

      const {
        maxRetries = 5,
        minTimeout = 500,
        maxTimeout = 10 * 1000,
        timeoutFactor = 2,
        methods = ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE', 'TRACE']
      } = opts.retryOptions || {};

      // If we reached the max number of retries
      if (state.counter > maxRetries) {
        return cb(err);
      }

      // If a set of method are provided and the current method is not in the list
      if (Array.isArray(methods) && !methods.includes(opts.method)) {
        return cb(err);
      }

      const headers = ('headers' in err && typeof err.headers === 'object') ? err.headers : undefined;

      const retryAfterHeader = (headers as Record<string, string> | null | undefined)?.['retry-after'];
      let retryAfter = -1;
      if (retryAfterHeader) {
        retryAfter = Number(retryAfterHeader);
        retryAfter = Number.isNaN(retryAfter)
          ? calculateRetryAfterHeader(retryAfterHeader)
          : retryAfter * 1e3; // Retry-After is in seconds
      }

      const retryTimeout = retryAfter > 0
        ? Math.min(retryAfter, maxTimeout)
        : Math.min(minTimeout * (timeoutFactor ** (state.counter - 1)), maxTimeout);

      console.log('[fetch retry]', 'schedule retry', { statusCode, retryTimeout, errorCode, url: opts.origin });
      // eslint-disable-next-line sukka/prefer-timer-id -- won't leak
      setTimeout(() => cb(null), retryTimeout);
    }
    // errorCodes: ['UND_ERR_HEADERS_TIMEOUT', 'ECONNRESET', 'ECONNREFUSED', 'ENOTFOUND', 'ENETDOWN', 'ENETUNREACH', 'EHOSTDOWN', 'EHOSTUNREACH', 'EPIPE', 'ETIMEDOUT']
  }),
  interceptors.redirect({
    maxRedirections: 5
  })
);

function calculateRetryAfterHeader(retryAfter: string) {
  const current = Date.now();
  return new Date(retryAfter).getTime() - current;
}

export class ResponseError<T extends UndiciResponseData | Response> extends Error {
  readonly code: number;
  readonly statusCode: number;

  constructor(public readonly res: T, public readonly url: string, ...args: any[]) {
    const statusCode = 'statusCode' in res ? res.statusCode : res.status;
    super('HTTP ' + statusCode + ' ' + args.map(_ => inspect(_)).join(' '));

    // eslint-disable-next-line sukka/unicorn/custom-error-definition -- deliberatly use previous name
    this.name = this.constructor.name;
    this.res = res;
    this.code = statusCode;
    this.statusCode = statusCode;
  }
}

export async function $$fetch(url: string, init?: RequestInit) {
  try {
    init ??= {};
    init.dispatcher = agent;

    const res = await undici.fetch(url, init);
    if (res.status >= 400) {
      throw new ResponseError(res, url);
    }

    if ((res.status < 200 || res.status > 299) && res.status !== 304) {
      throw new ResponseError(res, url);
    }

    return res;
  } catch (err: unknown) {
    if (isAbortErrorLike(err)) {
      console.log(picocolors.gray('[fetch abort]'), url);
    } else {
      console.log(picocolors.gray('[fetch fail]'), url, err);
    }

    throw err;
  }
}
