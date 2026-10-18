const form = document.querySelector('#shorten-form');
const message = document.querySelector('#message');
const result = document.querySelector('#result');
const link = document.querySelector('#short-link');
const submit = document.querySelector('#submit');
const copy = document.querySelector('#copy');
const copyMessage = document.querySelector('#copy-message');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  result.hidden = true;
  message.textContent = '';
  copyMessage.textContent = '';
  copy.textContent = 'Copy';
  submit.disabled = true;
  submit.textContent = 'Shortening…';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch('/api/shorten', {
      signal: controller.signal,
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({url: document.querySelector('#url').value.trim()})
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to shorten this link.');
    link.href = data.short_url;
    link.textContent = data.short_url;
    result.hidden = false;
  } catch (error) {
    message.textContent = error.name === 'AbortError'
      ? 'The server is not responding. Check that the application is running, then retry.'
      : error.message || 'Connection failed. Please retry.';
  } finally {
    clearTimeout(timeout);
    submit.disabled = false;
    submit.textContent = 'Shorten link →';
  }
});

copy.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(link.textContent);
    copy.textContent = 'Copied!';
    copyMessage.textContent = 'Link copied to your clipboard.';
  } catch {
    copyMessage.textContent = 'Copy is unavailable. Select the short link and copy it manually.';
  }
});

const statsForm = document.querySelector('#stats-form');
const statsSubmit = document.querySelector('#stats-submit');
const statsMessage = document.querySelector('#stats-message');
const statsResult = document.querySelector('#stats-result');

statsForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  statsResult.hidden = true;
  statsMessage.textContent = '';
  statsSubmit.disabled = true;
  statsSubmit.textContent = 'Looking up…';

  try {
    const code = document.querySelector('#short-code').value.trim();
    const response = await fetch(`/api/stats/${encodeURIComponent(code)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to load link stats.');

    document.querySelector('#stats-code').textContent = data.short_code;
    document.querySelector('#stats-clicks').textContent = data.clicks;
    document.querySelector('#stats-original-url').textContent = data.original_url;
    document.querySelector('#stats-created-at').textContent = data.created_at;
    statsResult.hidden = false;
  } catch (error) {
    statsMessage.textContent = error.message || 'Connection failed. Please retry.';
  } finally {
    statsSubmit.disabled = false;
    statsSubmit.textContent = 'Look up stats →';
  }
});

const themeToggle = document.querySelector('#theme-toggle');
const themeLabel = document.querySelector('.theme-label');
themeToggle.addEventListener('click', () => {
  const darkMode = document.documentElement.dataset.theme !== 'dark';
  document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
  themeToggle.setAttribute('aria-pressed', String(darkMode));
  themeToggle.setAttribute('aria-label', `Switch to ${darkMode ? 'light' : 'dark'} theme`);
  themeLabel.textContent = darkMode ? 'Light mode' : 'Dark mode';
});
