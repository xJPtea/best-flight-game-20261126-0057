// Skyline Courier — the hand-in program (Node 22, standard library only).
// It copies this repository's game/ and screenshots/ into the output
// directory and writes dossier.json there, using the vendored make.fun
// library's buildDossier with the scorer's own caps. It writes nowhere
// else, so it runs the same in the grader's read-only sandbox as it does
// here.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The caps are the scorer's: the dossier text is capped at 160 KiB, at
// most 4 screenshots of 256 KiB each, and game/ stays within 993 entries
// and 48 MiB so the whole output fits the platform's 1000-entry limit.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
