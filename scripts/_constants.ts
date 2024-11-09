import path from 'node:path';

export const PUBLIC_DIR = path.resolve(__dirname, '../public');
export const FILTERS_DIR = path.join(PUBLIC_DIR, 'filters');
export const SCRIPTLETS_DIR = path.join(PUBLIC_DIR, 'scriptlets');
