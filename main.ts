// Grader program: copies game/ and screenshots/ to MAKEFUN_OUTPUT_DIR and writes dossier.json.
// Node 22 standard library only. No build, no flags, no install.

import { buildDossier } from './vendor/makefun-game.ts';
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR || '/output';
const REPO_ROOT = dirname(fileURLToPath(import.meta.url));
const GAME_SRC = join(REPO_ROOT, 'game');
const SCREENSHOTS_SRC = join(REPO_ROOT, 'screenshots');
const GAME_DST = join(OUTPUT_DIR, 'game');
const SCREENSHOTS_DST = join(OUTPUT_DIR, 'screenshots');
const DOSSIER_PATH = join(OUTPUT_DIR, 'dossier.json');

const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function copyGameTree(): void {
  ensureDir(GAME_DST);
  // Copy entire game/ directory recursively
  cpSync(GAME_SRC, GAME_DST, { recursive: true, force: true });
}

function copyScreenshots(): void {
  ensureDir(SCREENSHOTS_DST);
  // Copy entire screenshots/ directory
  cpSync(SCREENSHOTS_SRC, SCREENSHOTS_DST, { recursive: true, force: true });
}

function verifyCopies(): void {
  // Verify game/index.html exists and is <= 1 MiB
  const indexHtml = join(GAME_DST, 'index.html');
  if (!existsSync(indexHtml)) throw new Error('game/index.html missing after copy');
  const indexStat = statSync(indexHtml);
  if (indexStat.size > 1024 * 1024) throw new Error(`game/index.html is ${indexStat.size} bytes, exceeds 1 MiB`);

  // Verify screenshots exist and are valid images
  const shotNames = ['1-play.jpg', '2-start.jpg', '3-power.jpg', '4-end.jpg'];
  for (const name of shotNames) {
    const path = join(SCREENSHOTS_DST, name);
    if (!existsSync(path)) throw new Error(`screenshots/${name} missing after copy`);
    const st = statSync(path);
    if (st.size > 262144) throw new Error(`screenshots/${name} is ${st.size} bytes, exceeds 256 KiB`);
    // Check magic bytes
    const buf = readFileSync(path);
    const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
    const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    if (!isPng && !isJpeg) throw new Error(`screenshots/${name} is not a valid PNG or JPEG`);
  }
}

function main(): void {
  try {
    copyGameTree();
    copyScreenshots();
    verifyCopies();

    const dossierBytes = buildDossier(OUTPUT_DIR, CAPS);
    writeFileSync(DOSSIER_PATH, Buffer.from(dossierBytes));

    console.log('OK');
    process.exit(0);
  } catch (err) {
    console.error('FAILED:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();