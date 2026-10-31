/*
 * `npm start`: run the add-on in a scratch Firefox profile.
 *
 * Optional local pin: `git config turengfirefox.startBranch <branch>` (stored in
 * .git/config, never pushed) makes npm start switch to that branch first, so it
 * always runs the same line of work whichever branch happens to be checked out.
 */
'use strict';
const { execSync, spawnSync } = require('child_process');

const git = (args) => execSync('git ' + args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const tryGit = (args) => { try { return git(args); } catch (e) { return ''; } };

const pinned = tryGit('config --get turengfirefox.startBranch');
const current = tryGit('branch --show-current');

if (pinned && current !== pinned) {
  if (tryGit('status --porcelain --untracked-files=no')) {
    console.error(`npm start: uncommitted changes on "${current}". Commit or stash them, then run it again.`);
    process.exit(1);
  }
  console.log(`npm start: switching from "${current}" to "${pinned}".`);
  execSync(`git checkout "${pinned}"`, { stdio: 'inherit' });
}

console.log(`npm start: running "${pinned || current || 'working tree'}".`);
const run = spawnSync('npx', ['web-ext', 'run', ...process.argv.slice(2)], { stdio: 'inherit', shell: true });
process.exit(run.status == null ? 1 : run.status);
