# Tureng Dictionary — Firefox Add-on

English ⇄ Turkish lookups from [tureng.com](https://tureng.com) without leaving the page.

Runs on Firefox for **Windows, macOS and Linux** — one signed `.xpi` installs on all three, and nothing in the add-on is platform-specific. Requires Firefox 142 or newer.

## Features

- **Toolbar popup** (`Alt+V`, `Control+Shift+V` on macOS) — search box with grouped results, categories and part of speech.
- **Selection auto-fill** — whatever is selected on the page is filled into the search box the moment the popup opens, and searched right away. Works for normal page text, text inside `<input>`/`<textarea>`, and text inside iframes.
- **Inline overlay** (`Alt+T`, `Control+Shift+T` on macOS, or right-click a selection) — results appear next to the selected text, in a shadow root so the host page's CSS can't break them.
- **Auto direction** — type English or Turkish; Tureng detects it and the UI labels the direction.
- **Source attribution** — every result view names Tureng as the source and links to tureng.com.
- **Light on Tureng's servers** — user-initiated lookups only, at most one request per second, cached in memory only (max 100 lookups, 24 hours, gone when Firefox closes).
- **No telemetry** — declares `data_collection_permissions: ["none"]`.

## Develop

```bash
npm install
npm start     # scratch profile, live-reloads on file changes
npm run lint  # currently 0 errors, 0 notices, 0 warnings
npm run build # -> web-ext-artifacts/*.zip
```

To load it into your normal profile for a quick test: `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on** → pick `manifest.json`. This is wiped on every restart — for a permanent install, see below.

## Install it permanently (private)

This is the route for using it yourself. Signing **unlisted** is not publication:
the add-on never appears in the add-ons store, never shows in search, and nobody
else can find or install it. Mozilla signs the file and hands it back.

Release and Beta Firefox only install **signed** add-ons. The `xpinstall.signatures.required` preference does not help — it is ignored outside Developer Edition, Nightly and ESR. So the add-on has to be signed by Mozilla, even for private use.

Signing it **unlisted** keeps it private: it is never published to the public add-ons directory, never appears in search, and nobody else can find or install it. Mozilla just signs the file and hands it back.

1. Create an account at [addons.mozilla.org](https://addons.mozilla.org/), then generate credentials at
   **[Developer Hub → Manage API Keys](https://addons.mozilla.org/en-US/developers/addon/api/key/)**.
   You get a JWT issuer (`user:12345678:123`) and a secret. The secret is shown **once**.

2. Sign it.

   macOS / Linux:

   ```bash
   export WEB_EXT_API_KEY="user:12345678:123"
   export WEB_EXT_API_SECRET="your-secret"
   npm run sign
   ```

   Windows (PowerShell):

   ```powershell
   $env:WEB_EXT_API_KEY = "user:12345678:123"
   $env:WEB_EXT_API_SECRET = "your-secret"
   npm run sign
   ```

   Automated review usually takes a few minutes. The signed `.xpi` lands in `web-ext-artifacts/`.

3. Install it: `about:addons` → the gear icon → **Install Add-on From File…** → pick the signed `.xpi`.

It now survives restarts like any normal add-on.

### Notes

- **Bump `version` in `manifest.json` before every re-sign.** AMO rejects a version number it has already seen.
- The add-on ID (`browser_specific_settings.gecko.id`) is claimed by your AMO account on first upload and cannot be transferred to another account.
- Unlisted add-ons do not auto-update unless you add an `update_url`. To upgrade, sign a new version and install the new `.xpi` over the old one.
- Source-code submission is only demanded for minified or obfuscated add-ons. This one is plain readable JS, so it passes automated review as-is.

## Publishing publicly

Tureng has granted permission to publish under the "Tureng" name. The add-on
keeps these commitments, and any change must preserve them:

- **Attribution.** Wherever results appear, they are marked as coming from Tureng
  with a clickable link to tureng.com (popup footer, overlay footer).
- **Independent.** The add-on and store descriptions state that this is an
  independent project, not an official Tureng add-on.
- **Tureng Neo slot.** A small promotion area in the popup, with artwork and link
  supplied by Tureng, configured in `src/promo.js`.
- **Polite traffic only.** Requests happen only for user-initiated lookups, at
  most one per second, with concurrent duplicates merged into one. No crawling, no
  bulk fetching, and no stored copy of Tureng content: the cache lives in
  `storage.session` (memory only), holds at most 100 lookups for 24 hours, and is
  gone when Firefox closes.
- **Free, no third-party ads.** Any commercial model needs Tureng's approval first.
- **Review before release.** Tureng sees the final build, store listing and
  screenshots before anything is published.

### Remaining steps

1. ~~Add the Tureng Neo artwork and links~~ — done in 0.3.0 (`promo/tureng-neo.svg`, two store links).
2. `npm run build`, capture screenshots, and send the build,
   [docs/amo-listing.md](docs/amo-listing.md) and the screenshots to Tureng.
3. After their approval, submit through the
   [Developer Hub](https://addons.mozilla.org/developers/) as a listed add-on.
   `web-ext sign` cannot upload screenshots, so the web form is the simpler route
   for the first public version.

### Without an AMO account

The only alternative is a Firefox build that permits unsigned add-ons — **Developer Edition**, **Nightly** or **ESR** — where you set `xpinstall.signatures.required` to `false` in `about:config` and install the unsigned `.zip`. Release and Beta builds ignore that preference.

## Layout

| Path | Role |
| --- | --- |
| `manifest.json` | MV3, `background.scripts` (Firefox has no extension service worker) |
| `src/tureng.js` | URL building, HTML parsing, rate limit, memory-only cache |
| `src/selection.js` | Reads the page selection across frames, inputs and textareas |
| `src/background.js` | Context menu, keyboard commands, injection; runs every lookup |
| `src/popup/` | Toolbar popup UI |
| `src/content/inline.js` | On-demand shadow-DOM overlay |
| `src/options/` | Settings (overlay vs. new tab, row count, clear cache) |
| `src/promo.js` | Tureng Neo promotion slot: artwork path and the clickable regions for each store link |
| `promo/` | Banner artwork supplied by Tureng (bundled, never fetched remotely) |
| `docs/amo-listing.md` | Store listing draft, Turkish and English |

## How the scraping works

Tureng has no public API, so `src/tureng.js` fetches `https://tureng.com/en/turkish-english/<term>` and parses the HTML with `DOMParser`.

Notes on their markup, verified against the live site:

- Results live in `table.searchResultsTable`. There can be **two** — exact meanings, then "with other terms" (phrases). Both carry `id="englishResultsTable"`, so the id is *not* unique; always select by class.
- Term cells are identified by `lang="en"` / `lang="tr"`. **Their column order flips** depending on the query language, so the parser keys off the `lang` attribute, never the column index.
- Part of speech is a trailing `<i>` inside the term cell (`n.`, `v.`, `adj.`).
- A miss renders `<h1>Term not found</h1>` with no results table.
- Rows tagged `.mobile-category-row` are mobile-only duplicates and are skipped.

`robots.txt` disallows `/user/`, `/history/` and any query-string URL, but not the `/en/turkish-english/<term>` paths this add-on uses. The site 403s non-browser user agents; a real extension request is unaffected. Lookups are user-initiated and rate-limited — see *Publishing publicly*.

Since this depends on Tureng's HTML, a redesign on their side can break parsing — `parse()` in `src/tureng.js` is the single place to fix.

## Firefox vs. Chrome differences that shaped this

- **Background:** Firefox does not support `background.service_worker`; it uses `background.scripts` event pages. Upside: `DOMParser` is available, so parsing is real DOM work rather than regex.
- **Add-on ID:** `browser_specific_settings.gecko.id` is mandatory.
- **Host permissions:** granted at install since Firefox 127.
- **Data disclosure:** `data_collection_permissions` is required for new add-ons (Firefox 140+/Android 142+), which is why `strict_min_version` is `142.0`.

## Prior art

The community Chrome extension [kdemirel/Tureng-Chrome](https://github.com/kdemirel/Tureng-Chrome) (~40k users) informed the feature set. This add-on differs by parsing with `DOMParser` instead of regex, reading both result tables, keeping category and part of speech, handling Turkish→English column flipping, caching, and injecting the overlay on demand via `activeTab` rather than running a content script on every page.

## Not affiliated with Tureng.

