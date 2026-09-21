import { spawn, spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const jestArgs = ['--experimental-vm-modules', require.resolve('jest/bin/jest'), '--config', 'jest.config.cjs'];
const args = process.argv.slice(2);
const watching = args.includes('--watch');
rmSync('.test-dist', { recursive: true, force: true });
const compile = spawnSync('tsc', ['-p', 'tsconfig.test.json'], { stdio: 'inherit', shell: process.platform === 'win32' });
if (compile.status !== 0) process.exit(compile.status ?? 1);
if (watching) {
  const compiler = spawn('tsc', ['-p', 'tsconfig.test.json', '--watch', '--preserveWatchOutput'], { stdio: 'inherit', shell: process.platform === 'win32' });
  const jest = spawn(process.execPath, [...jestArgs, '--watchAll', ...args.filter(arg => arg !== '--watch')], { stdio: 'inherit', shell: process.platform === 'win32' });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { compiler.kill(signal); jest.kill(signal); process.exit(); });
  jest.on('exit', code => { compiler.kill(); process.exit(code ?? 1); });
} else {
  const jest = spawnSync(process.execPath, [...jestArgs, ...args], { stdio: 'inherit', shell: process.platform === 'win32' });
  process.exit(jest.status ?? 1);
}
