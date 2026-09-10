(() => {
  const S = window.TC, $ = S.$;
  const ENDPOINT_KEY = 'trainerCardOpenAIEndpoint';
  const ACCESS_KEY = 'trainerCardOpenAIAccessCode';

  S.getOpenAIConfig = () => ({
    endpoint: (localStorage.getItem(ENDPOINT_KEY) || '').trim(),
    accessCode: localStorage.getItem(ACCESS_KEY) || ''
  });

  S.hasOpenAIConfig = () => {
    const { endpoint, accessCode } = S.getOpenAIConfig();
    return /^https:\/\//i.test(endpoint) && !!accessCode;
  };

  S.refreshOpenAIStatus = () => {
    const endpoint = $('aiEndpoint');
    const accessCode = $('aiAccessCode');
    const status = $('aiStatus');
    if (!endpoint || !accessCode || !status) return;
    const cfg = S.getOpenAIConfig();
    endpoint.value = cfg.endpoint;
    accessCode.value = cfg.accessCode;
    if (S.hasOpenAIConfig()) {
      status.textContent = 'OpenAI ready';
      status.className = 'chip accent';
    } else {
      status.textContent = 'Setup required';
      status.className = 'chip';
    }
  };

  S.saveOpenAIConfig = () => {
    const endpoint = ($('aiEndpoint')?.value || '').trim().replace(/\/$/, '');
    const accessCode = $('aiAccessCode')?.value || '';
    if (endpoint && !/^https:\/\//i.test(endpoint)) {
      S.toast('The AI endpoint must start with https://');
      return false;
    }
    localStorage.setItem(ENDPOINT_KEY, endpoint);
    localStorage.setItem(ACCESS_KEY, accessCode);
    S.refreshOpenAIStatus();
    S.toast(S.hasOpenAIConfig() ? 'OpenAI Vision connection saved.' : 'AI connection cleared.');
    return true;
  };

  async function imageDataURL(img) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const max = 1800;
    const scale = Math.min(1, max / Math.max(iw, ih));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(iw * scale));
    c.height = Math.max(1, Math.round(ih * scale));
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.88);
  }

  function setField(id, value, confidence) {
    if (value === null || value === undefined || value === '') {
      S.setState(id, 'review');
      return;
    }
    if (['caught', 'stops', 'xp'].includes(id)) {
      value = Number(value).toLocaleString('en-US');
    }
    $(id).value = String(value);
    S.setState(id, Number(confidence || 0) >= 0.82 ? 'ok' : 'review');
  }

  S.scanProfileOpenAI = async () => {
    if (!S.sourceImage) return false;
    const cfg = S.getOpenAIConfig();
    if (!S.hasOpenAIConfig()) return false;

    const token = ++S.jobToken;
    S.scanning = true;
    $('scanCard').classList.remove('hidden');
    $('scanTitle').textContent = 'Reading profile with OpenAI Vision…';
    $('scanDetail').textContent = 'Uploading screenshot securely';
    $('scanPct').textContent = 'AI';

    try {
      const image = await imageDataURL(S.sourceImage);
      if (token !== S.jobToken) return false;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 70000);
      const response = await fetch(cfg.endpoint + '/analyze', {
        method: 'POST',
        headers: {'content-type':'application/json'},
        body: JSON.stringify({ image, accessCode: cfg.accessCode }),
        signal: controller.signal
      });
      clearTimeout(timeout);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const msg = payload?.error || `AI request failed (${response.status})`;
        throw new Error(msg);
      }
      if (token !== S.jobToken) return false;

      const p = payload.profile || {};
      const c = p.confidence || {};
      setField('trainerName', p.trainerName, c.trainerName);
      setField('level', p.level, c.level);
      setField('buddy', p.buddyName, c.buddyName);
      setField('caught', p.pokemonCaught, c.pokemonCaught);
      setField('stops', p.pokeStopsVisited, c.pokeStopsVisited);
      setField('xp', p.totalXP, c.totalXP);
      setField('startDate', p.startDate, c.startDate);

      if (['valor','mystic','instinct'].includes(p.team)) S.setTeam(p.team, true);
      S.openAITrainerBox = p.trainerBox || null;
      S.openAIBuddyBox = p.buddyBox || null;
      S.updateQuality();
      S.drawFront();
      S.drawBack();

      const remaining = Number(payload.remainingBudget);
      $('scanTitle').textContent = 'OpenAI Vision scan complete';
      $('scanDetail').textContent = Number.isFinite(remaining)
        ? `Estimated API budget remaining: $${Math.max(0, remaining).toFixed(2)}`
        : 'Profile fields extracted';
      S.toast('OpenAI Vision extracted the profile. Review any field marked Review.');
      return true;
    } catch (err) {
      console.error('OpenAI Vision scan failed', err);
      const message = err?.name === 'AbortError' ? 'OpenAI Vision timed out.' : (err?.message || 'OpenAI Vision failed.');
      S.toast(message + ' Falling back to local OCR.');
      return false;
    } finally {
      if (token === S.jobToken) {
        S.scanning = false;
        $('scanCard').classList.add('hidden');
      }
    }
  };

  document.addEventListener('DOMContentLoaded', S.refreshOpenAIStatus);
})();