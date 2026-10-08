import assert from 'node:assert/strict';
import {
  basenameFromPath,
  parseFilenameMeta,
  pickPreferredTitle,
  resolveFileMeta,
} from '../src/utils/metadata.ts';

const bladeBase =
  'Blade.Runner.2049.2017.UHD.BluRay.2160p.DDP.7.1.DV.HDR.x265-hallowed.mkv';

const parsed = parseFilenameMeta(bladeBase);
assert.equal(parsed.title, 'Blade Runner 2049');
assert.equal(parsed.year, '2017');

assert.equal(pickPreferredTitle('Blade Runner', 'Blade Runner 2049'), 'Blade Runner 2049');

const nfo = '<title>Blade Runner</title><year>1982</year><plot>Test</plot>';
const merged = resolveFileMeta(
  {
    name: 'Blade Runner 2049 2017 UHD',
    path: `C:/Movies/${bladeBase}`,
    localNfoContent: nfo,
  },
  'movie',
);
assert.equal(merged.title, 'Blade Runner 2049');
assert.equal(basenameFromPath(merged.title ? `x/${bladeBase}` : ''), bladeBase);

const spider = parseFilenameMeta(
  'Spider-Man.Brand.New.Day.2026.WEB-DL.2160p.HDR.DV.seleZen.mkv',
);
assert.equal(spider.title, 'Spider Man Brand New Day');
assert.equal(spider.year, '2026');

console.log('metadata tests passed');
