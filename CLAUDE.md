# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Aniket Suryavanshi's personal site — an "online visiting card" plus a handful of unrelated one-off HTML pages. It's plain HTML/CSS/JS with jQuery, no framework, no bundler beyond Grunt, deployed as a static site (GitHub Pages, repo name `anikets.github.io`).

There is no single "app" here — treat each top-level HTML file as its own small, mostly independent artifact.

## Build

```
npm install     # installs Grunt + plugins (devDependencies)
./node_modules/.bin/bower install   # installs jquery into bower_components/ (needed by grunt concat)
grunt           # runs the default task: uglify -> htmlmin -> concat
```

Neither `node_modules/` nor `bower_components/` are currently installed in this checkout — run the above before expecting `grunt` to work.

Grunt tasks (`Gruntfile.js`):
- **uglify**: minifies `assets/anikets.github.io.js` → `assets/anikets.github.io.min.js`, and `assets/jquery.fittext.js` → `assets/jquery.fittext.min.js`.
- **htmlmin**: generates `index.html` from `index-dev.html` (collapses whitespace, strips it down for production).
- **concat**: bundles `bower_components/jquery/dist/jquery.min.js` + `assets/jquery.fittext.min.js` + `assets/anikets.github.io.min.js` into `assets/behaviour.min.js`, which is the only script `index.html` actually loads.

There are no tests and no linter config beyond `.editorconfig` (LF line endings, 4-space indent for JS, 2-space under `dev/**`).

## Important: index.html vs index-dev.html has drifted

`index.html` is supposed to be *generated* from `index-dev.html` via `grunt htmlmin`, and source edits belong in `index-dev.html`. In practice the most recent nav/link changes were made directly to `index.html` without updating `index-dev.html` or re-running Grunt, so the two files currently disagree (`index-dev.html` still has the old `bit.ly` redirect links and a commented-out Blog link that `index.html` no longer has). When editing the homepage nav or head, check both files and keep them consistent rather than assuming a `grunt` run will reconcile them.

## Structure

- `index.html` / `index-dev.html` — the actual visiting-card homepage (built output vs. dev source, see caveat above).
- `assets/appearance.css` — a Meyer CSS reset followed by the site's actual styles, in one file.
- `assets/anikets.github.io.js` — the site's own behavior (currently just: un-hide the `<h1>`/`<nav>` and run `fitText()`); this is the file to edit, not the `.min.js` next to it.
- `assets/behaviour.min.js` — build output loaded by `index.html`; don't hand-edit, regenerate via `grunt`.
- `assets/jquery.fittext.js` — vendored FitText plugin (auto-scaling text).
- `build/` — a stale leftover from a 2014 Grunt test run; not referenced by anything and safe to ignore.
- `countdown.html`, `Wordlers_Infographic.html` — standalone one-off pages, each self-contained, not wired into the Grunt build or `index.html`. Treat each as its own isolated artifact when editing.
- `cgt-2026/` — a separate self-contained sub-project (a trek video-generator HTML file); it has its own `cgt-2026/CLAUDE.md` with detailed context — read that before touching anything in this directory. Currently untracked in git.
