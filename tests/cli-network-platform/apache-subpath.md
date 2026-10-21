# Apache-authenticated subpath deployment

Prerequisites: build with CODEXUI_BASE_PATH=/codex/, serve the installed app with
CODEXUI_BASE_PATH=/codex/, CODEXUI_HOST=127.0.0.1, CODEXUI_STRICT_PORT=1, and
--no-password --no-open --no-tunnel --no-login. Apache must authenticate every
/codex/ request and WebSocket handshake before stripping the prefix upstream.
Never expose the password-disabled backend outside loopback.

1. Visit /codex/ through Apache; anonymous access must receive 401. Log in using
   an allowed PAM-group account. Check page, JS/CSS, icons and manifest load
   under /codex/, with no root-level /assets or /codex-api requests.
2. Select an existing conversation, reload its hash route, and verify its title
   and rendered history survive. Confirm realtime connection uses
   /codex/codex-api/ws (or the prefixed SSE fallback), with no duplicate connection
   loops or growing request fanout.
3. In a TestChat fixture, send a unique marker with a local markdown file link
   and image reference. Verify rendered href, title and text are correct; browse,
   edit and image URLs remain under /codex/. Test opening links in new tabs.
   Do not expose or record private histories/credentials in automation artifacts.
4. Verify the service worker scope and manifest scope/start URL are /codex/.
   Load ChlamyFP in another tab and confirm its routing/cache remains unaffected.
5. Verify the backend listens only on 127.0.0.1 and refuses port fallback when
   CODEXUI_STRICT_PORT=1. CodexUI must run as codex, not www-data or root.
6. Verify the bare hostname still redirects to ChlamyFP; phpMyAdmin remains
   independently accessible; /md stays closed until its separate deployment.

Rollback/cleanup: select the prior package release with the deployment updater,
restore compatible unit/environment/proxy settings, and stop the service if the
prior build cannot be bound safely. Remove only this test's fixture artifacts.
Do not clear other applications' service workers or caches.

Performance audit: URL prefixing is synchronous string work only; it adds no
requests, timers or listeners. Existing streaming connection creation/retry
paths are unchanged. Worker fetch bypass and cache deletion are scope-limited;
the app does not scan or purge other application caches. Record build sizes and
startup/backend memory during deployment; authenticated browser traffic and
successful PAM cost require separate user/browser verification.
