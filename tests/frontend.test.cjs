// Run with: node --test tests/frontend.test.cjs
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function page(fetch) {
  const elements = {};
  let expire;
  let cleared = false;
  for (const id of [
    'shorten-form', 'message', 'result', 'short-link', 'submit', 'copy', 'copy-message', 'url',
    'stats-form', 'stats-submit', 'stats-message', 'stats-result', 'short-code', 'stats-code',
    'stats-clicks', 'stats-original-url', 'stats-created-at', 'theme-toggle'
  ]) {
    elements['#' + id] = {
      value: 'https://example.com', textContent: '', hidden: true, disabled: false,
      attributes: {},
      addEventListener(event, handler) { this[event] = handler; },
      setAttribute(name, value) { this.attributes[name] = value; }
    };
  }
  elements['.theme-label'] = {textContent: ''};
  const documentElement = {dataset: {}};
  vm.runInNewContext(fs.readFileSync('static/app.js', 'utf8'), {
    document: {querySelector: id => elements[id], documentElement},
    navigator: {clipboard: {writeText: async () => {}}},
    fetch, AbortController,
    setTimeout(callback, milliseconds) { assert.equal(milliseconds, 10000); expire = callback; return 1; },
    clearTimeout() { cleared = true; }
  });
  return {
    elements,
    documentElement,
    expire: () => expire(),
    cleared: () => cleared,
    submit: () => elements['#shorten-form'].submit({preventDefault() {}}),
    lookup: () => elements['#stats-form'].submit({preventDefault() {}}),
    copy: () => elements['#copy'].click()
  };
}

test('unresponsive server times out and restores the button', async () => {
  const ui = page((url, {signal}) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(Object.assign(new Error(), {name: 'AbortError'})));
  }));
  const pending = ui.submit();
  assert.equal(ui.elements['#submit'].disabled, true);
  assert.equal(ui.elements['#submit'].textContent, 'Shortening…');
  ui.expire();
  await pending;
  assert.equal(ui.elements['#submit'].disabled, false);
  assert.match(ui.elements['#message'].textContent, /server is not responding/);
  assert.equal(ui.cleared(), true);
});

test('successful response displays the generated link', async () => {
  const ui = page(async () => ({ok: true, json: async () => ({short_url: 'http://localhost:8000/abc1234'})}));
  await ui.submit();
  assert.equal(ui.elements['#result'].hidden, false);
  assert.equal(ui.elements['#short-link'].href, 'http://localhost:8000/abc1234');
  assert.equal(ui.elements['#submit'].disabled, false);
  assert.equal(ui.cleared(), true);
});

test('network failure displays an error and restores the button', async () => {
  const ui = page(async () => { throw new Error('Failed to fetch'); });
  await ui.submit();
  assert.equal(ui.elements['#message'].textContent, 'Failed to fetch');
  assert.equal(ui.elements['#submit'].disabled, false);
  assert.equal(ui.elements['#result'].hidden, true);
});

test('copy button confirms when the short link is copied', async () => {
  const ui = page(async () => ({ok: true, json: async () => ({short_url: 'https://short.example/abc1234'})}));
  await ui.submit();
  await ui.copy();
  assert.equal(ui.elements['#copy'].textContent, 'Copied!');
  assert.equal(ui.elements['#copy-message'].textContent, 'Link copied to your clipboard.');
});

test('stats lookup encodes the code and renders response values as text', async () => {
  let requestedUrl;
  const ui = page(async url => {
    requestedUrl = url;
    return {
      ok: true,
      json: async () => ({
        short_code: 'abc1234',
        clicks: 2,
        original_url: '<img src=x onerror=alert(1)>',
        created_at: '2026-10-18T00:00:00+00:00'
      })
    };
  });
  ui.elements['#short-code'].value = 'abc/123';
  await ui.lookup();
  assert.equal(requestedUrl, '/api/stats/abc%2F123');
  assert.equal(ui.elements['#stats-original-url'].textContent, '<img src=x onerror=alert(1)>');
  assert.equal(ui.elements['#stats-clicks'].textContent, 2);
  assert.equal(ui.elements['#stats-result'].hidden, false);
});
