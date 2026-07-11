import path from 'node:path';
import redirectRuleSets from '../src/url-redirector';
import type { RedirectRule, RedirectRuleSet } from '../src/url-redirector';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import { OUTPUT_URL_REDIRECTOR_DIR } from './_constants';
import { escapeRegexp } from 'fast-escape-regexp';
import { fastStringArrayJoin } from 'foxts/fast-string-array-join';
import picocolors from 'picocolors';
import { castArray } from 'foxts/cast-array';

const REGEX_SHORTHANDS = { // NEEDS TO BE ENTIRELY GROUPED for replace with $1, $2, ...
  '[subdomain]': /([^/]+)/.source,
  '[version]': /((?:\d+\.)+\d+)/.source,
  '[semver]': /((?:\d+\.)+\d+(?:[+-][\w.-]+)*)/.source,
  '[version_major]': /(\d+)(?:\.\d+)+/.source,
  '[semver_major]': /(\d+)(?:\.\d+)+(?:[+-][\w.-]+)*/.source,
  '[non_path_segment]': /([^/]+)/.source,
  '[filename_basename_1_extname_2]': /([^./]+)\.([^/]+)?/.source
} as const;

function escapeForUriTransform(value: string) {
  let result = '';
  let backslashCount = 0;

  for (let i = 0, len = value.length; i < len; i++) {
    const char = value[i];

    if (char === '/') {
      result += backslashCount % 2 === 1 ? '/' : String.raw`\/`;
      backslashCount = 0;
      continue;
    }

    result += char;
    backslashCount = char === '\\' ? backslashCount + 1 : 0;
  }

  return result;
}

function hasRegexShorthand(value: string) {
  return value.includes('[') && value.includes(']');
}

function getReplaceFrom(from: RedirectRule['from']) {
  if (from instanceof RegExp) {
    return from;
  }

  if (!hasRegexShorthand(from)) {
    return from;
  }

  return new RegExp(getStringPatternSource(from));
}

function getStringPatternSource(from: string) {
  if (!hasRegexShorthand(from)) {
    return escapeRegexp(from, false);
  }

  let result = '';
  let cursor = 0;

  while (cursor < from.length) {
    const nextIndex = from.indexOf('[', cursor);

    if (nextIndex === -1) {
      result += escapeRegexp(from.slice(cursor), false);
      break;
    }

    const closeIndex = from.indexOf(']', nextIndex);
    if (closeIndex === -1) {
      result += escapeRegexp(from.slice(cursor), false);
      break;
    }

    const token = from.slice(nextIndex, closeIndex + 1);
    result += escapeRegexp(from.slice(cursor, nextIndex), false);

    if (token in REGEX_SHORTHANDS) {
      result += REGEX_SHORTHANDS[token as keyof typeof REGEX_SHORTHANDS];
    } else {
      // raw regex: emit the bracket contents as a capturing group
      result += `(${token.slice(1, -1)})`;
    }

    cursor = closeIndex + 1;
  }

  return result;
}

function getPatternSource(from: RedirectRule['from']) {
  if (from instanceof RegExp) {
    return escapeForUriTransform(from.source);
  }

  return escapeForUriTransform(getStringPatternSource(from));
}

function getDomainModifier(excludeDomains?: string[]) {
  if (!excludeDomains?.length) {
    return '';
  }

  return `,domain=${fastStringArrayJoin(excludeDomains.map(domain => `~${domain}`), '|')}`;
}

function formatRuleBase(base: RedirectRule['base']) {
  return Array.isArray(base) ? fastStringArrayJoin(base, ', ') : base;
}

function verifyRedirectRules(ruleSet: RedirectRuleSet) {
  for (const rule of ruleSet.rules) {
    const replaceFrom = getReplaceFrom(rule.from);

    for (const [original, expected] of rule.tests) {
      const actual = original.replace(replaceFrom, rule.to);

      if (actual !== expected) {
        throw new TypeError(
          [
            `Redirect filter: ${ruleSet.title} (${ruleSet.fileName})`,
            `Redirect rule test failed for base "${formatRuleBase(rule.base)}"`,
            `original: ${original}`,
            `from    : ${picocolors.green(getPatternSource(rule.from))}`,
            `expected: ${picocolors.red(expected)}`,
            `actual  : ${picocolors.green(actual)}`
          ].join('\n')
        );
      }
    }
  }
}

function serializeRedirectRule(base: string, rule: RedirectRule, parameterType: 'uritransform' | 'urltransform') {
  return `${base}$${fastStringArrayJoin(rule.modifiers ?? ['all'], ',')},${parameterType}=/${getPatternSource(rule.from)}/${escapeForUriTransform(rule.to)}/${getDomainModifier(rule.excludeDomains)}`;
}

function getOutputFileHeader(title: string) {
  return [
    `! Title: [sukka] ${title}`,
    `! Last modified: ${new Date().toUTCString()}`,
    '! Description: uBlock Origin / AdGuard uritransform rules',
    '! Homepage: https://github.com/SukkaW/Filters',
    '! License: https://github.com/SukkaW/Filters/blob/master/LICENSE',
    ''
  ];
}

async function buildRedirectRuleSet(ruleSet: RedirectRuleSet) {
  verifyRedirectRules(ruleSet);

  const output = getOutputFileHeader(ruleSet.title);

  // uBlock Origin uses uritransform
  output.push('! >>>> uBlock Origin');
  for (const rule of ruleSet.rules) {
    for (const base of castArray(rule.base)) {
      output.push(serializeRedirectRule(base, rule, 'uritransform'));
    }
  }

  // AdGuard uses urltransform
  output.push('', '! >>>> AdGuard');
  for (const rule of ruleSet.rules) {
    for (const base of castArray(rule.base)) {
      output.push(serializeRedirectRule(base, rule, 'urltransform'));
    }
  }

  await fsp.writeFile(
    path.join(OUTPUT_URL_REDIRECTOR_DIR, `${ruleSet.fileName}.txt`),
    fastStringArrayJoin(output, '\n')
  );
}

export async function buildUrlRedirector() {
  fs.mkdirSync(OUTPUT_URL_REDIRECTOR_DIR, { recursive: true });

  await Promise.all(redirectRuleSets.map(buildRedirectRuleSet));
}

if (require.main === module) {
  buildUrlRedirector().catch(console.error);
}
