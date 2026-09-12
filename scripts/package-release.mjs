import { mkdir, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed`);
  }
};

const read = (command, args) => {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed`);
  }
  return result.stdout.trim();
};

const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '_');
const sha = read('git', ['rev-parse', '--short=12', 'HEAD']);
const outDir = 'release';

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

run('npm', ['run', 'check']);
run('npm', ['run', 'build']);

const sourceZip = `${outDir}/fgdll-web-source_${stamp}_${sha}.zip`;
const hostingerZip = `${outDir}/fgdll-web-hostinger-dist_${stamp}_${sha}.zip`;
const sitesTar = `${outDir}/fgdll-web-chatgpt-sites_${stamp}_${sha}.tar.gz`;

run('git', ['archive', '--format=zip', `--output=${sourceZip}`, 'HEAD']);
run('zip', ['-qr', `../${hostingerZip}`, '.'], { cwd: 'dist' });
run('/Users/laucortazar/.codex/.tmp/bundled-marketplaces/openai-bundled/plugins/sites/skills/sites-hosting/scripts/package-site.sh', [process.cwd(), sitesTar]);

console.log(JSON.stringify({
  commit: read('git', ['rev-parse', 'HEAD']),
  sourceZip,
  hostingerZip,
  sitesTar
}, null, 2));
