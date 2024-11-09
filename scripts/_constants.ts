import path from 'node:path';

export const SRC_DIR = path.resolve(__dirname, '../src');
export const SRC_FILTERS_DIR = path.join(SRC_DIR, 'filters');
export const SRC_SCRIPTLETS_DIR = path.join(SRC_DIR, 'scriptlets');

export const PUBLIC_DIR = path.resolve(__dirname, '../public');
export const OUTPUT_FILTERS_DIR = path.join(PUBLIC_DIR, 'filters');
export const OUTPUT_SCRIPTLETS_DIR = path.join(PUBLIC_DIR, 'scriptlets');
