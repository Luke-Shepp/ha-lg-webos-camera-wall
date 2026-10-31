/* Full-screen camera grid for webOS 22 (Chromium 87). */
(function () {
  'use strict';

  var KEY = 'lgweboscamerawall.settings';
  var webos = window.webOSSystem || window.PalmSystem || null;
  var grid = document.getElementById('grid');
  var message = document.getElementById('message');
  var settingsPanel = document.getElementById('settings');
  var settingsError = document.getElementById('settings-error');
  var pageLabel = document.getElementById('page');
  var countLabel = document.getElementById('count');
  var selectionLabel = document.getElementById('selection');
  var urlInput = document.getElementById('ha-url');
  var tokenInput = document.getElementById('ha-token');
  var modeInput = document.getElementById('mode');
  var ha = null;
  var cameras = [];
  var players = [];
  var page = 0;
  var selected = 0;
  var single = false;
  var generation = 0;
  var settings = readSettings();

  function readSettings() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch (e) { return {}; }
  }

  function saveSettings() {
    try { localStorage.setItem(KEY, JSON.stringify(settings)); return true; }
    catch (e) { return false; }
  }

  function params(raw) {
    if (!raw) return {};
    if (typeof raw === 'object') return raw;
    try { return JSON.parse(raw); } catch (e) { return {}; }
  }

  function applyParams(p) {
    if (p.connect && p.connect.url && p.connect.token) {
      settings.url = String(p.connect.url).replace(/\/+$/, '');
      settings.token = String(p.connect.token);
    }
    if (Array.isArray(p.cameras)) {
      settings.cameras = p.cameras.filter(function (id) {
        return typeof id === 'string' && id.indexOf('camera.') === 0;
      });
    }
    if (p.mode === 'snapshot' || p.mode === 'mjpeg' || p.mode === 'hls') settings.mode = p.mode;
    if (p.connect || Array.isArray(p.cameras) || p.mode) saveSettings();
    openWall();
  }

  function stopPlayers() {
    generation++;
    players.forEach(function (p) { p.stop(); });
    players = [];
  }

  function showMessage(text) {
    message.textContent = text;
    message.classList.remove('hidden');
    grid.classList.add('hidden');
  }

  function openWall() {
    settingsPanel.classList.add('hidden');
    stopPlayers();
    if (ha) ha.close();
    ha = null;
    if (!settings.url || !settings.token) { openSettings(); return; }
    showMessage('Connecting to Home Assistant…');
    var current = generation;
    var client = new HAClient(settings.url, settings.token);
    ha = client;
    client.connect().then(function () { return client.listCameras(); }).then(function (all) {
      if (current !== generation) return;
      if (Array.isArray(settings.cameras) && settings.cameras.length) {
        cameras = settings.cameras.map(function (id) {
          return all.filter(function (c) { return c.id === id; })[0] || { id: id, name: id };
        });
      } else {
        cameras = all;
      }
      page = 0;
      selected = 0;
      single = false;
      render();
    }).catch(function (err) {
      if (current === generation) showMessage('Could not open cameras: ' + (err.message || err));
    });
  }

  function createTile(camera, index, current) {
    var tile = document.createElement('div');
    tile.className = 'tile' + (index === selected ? ' selected' : '');
    var video = document.createElement('video');
    video.className = 'hidden';
    video.setAttribute('playsinline', '');
    video.muted = true;
    var image = document.createElement('img');
    image.className = 'hidden';
    image.alt = '';
    var state = document.createElement('div');
    state.className = 'state';
    state.textContent = 'Loading…';
    var name = document.createElement('div');
    name.className = 'name';
    name.textContent = camera.name;
    tile.appendChild(video);
    tile.appendChild(image);
    tile.appendChild(state);
    tile.appendChild(name);
    tile.addEventListener('click', function () {
      selected = index;
      if (single) single = false;
      else single = true;
      render();
    });
    var player = new Player(video, image, function (status) {
      if (current !== generation) return;
      if (status === 'playing') state.textContent = '';
      else if (status === 'loading') state.textContent = 'Loading…';
    });
    players.push(player);
    var mode = settings.mode || 'mjpeg';
    player.play(ha, { camera: camera.id, mode: mode, refresh: 1000 }).catch(function (err) {
      if (current !== generation) return;
      if (mode !== 'snapshot') {
        state.textContent = 'Trying snapshots…';
        player.play(ha, { camera: camera.id, mode: 'snapshot', refresh: 1000 }).catch(function (fallbackError) {
          if (current === generation) state.textContent = fallbackError.message || String(fallbackError);
        });
      } else {
        state.textContent = err.message || String(err);
      }
    });
    return tile;
  }

  function render() {
    stopPlayers();
    grid.textContent = '';
    if (!cameras.length) {
      showMessage('No camera entities found in Home Assistant. Check your camera selection or add a camera in HA.');
      countLabel.textContent = '';
      pageLabel.textContent = '';
      return;
    }
    message.classList.add('hidden');
    grid.classList.remove('hidden');
    grid.classList.toggle('single', single);
    var pages = Math.ceil(cameras.length / 4);
    page = Math.min(page, pages - 1);
    var visible = cameras.slice(page * 4, page * 4 + 4);
    var current = generation;
    visible.forEach(function (camera, i) {
      if (!single || i === selected) grid.appendChild(createTile(camera, i, current));
    });
    countLabel.textContent = cameras.length + ' camera' + (cameras.length === 1 ? '' : 's');
    pageLabel.textContent = 'Page ' + (page + 1) + ' / ' + pages + (single ? ' · enlarged' : '');
  }

  function openSettings() {
    stopPlayers();
    if (ha) ha.close();
    ha = null;
    settingsPanel.classList.remove('hidden');
    urlInput.value = settings.url || '';
    tokenInput.value = settings.token || '';
    modeInput.value = settings.mode || 'mjpeg';
    selectionLabel.textContent = settings.cameras && settings.cameras.length
      ? 'Selected in HA: ' + settings.cameras.join(', ')
      : 'Camera selection: all cameras (four per page)';
    settingsError.textContent = '';
    urlInput.focus();
  }

  function closeApp() {
    stopPlayers();
    if (ha) ha.close();
    if (webos && typeof webos.close === 'function') webos.close();
    else window.close();
  }

  document.getElementById('settings-button').addEventListener('click', openSettings);
  document.getElementById('refresh-button').addEventListener('click', openWall);
  document.getElementById('save-button').addEventListener('click', function () {
    settings.url = urlInput.value.trim().replace(/\/+$/, '');
    settings.token = tokenInput.value.trim();
    settings.mode = modeInput.value;
    if (!settings.url || !settings.token) { settingsError.textContent = 'Enter both URL and token.'; return; }
    if (!saveSettings()) { settingsError.textContent = 'Could not save settings on this TV.'; return; }
    openWall();
  });
  document.getElementById('cancel-button').addEventListener('click', function () {
    if (settings.url && settings.token) openWall();
    else closeApp();
  });

  document.addEventListener('keydown', function (e) {
    var key = e.keyCode;
    if (!settingsPanel.classList.contains('hidden')) {
      if (key === 461 || key === 27) { e.preventDefault(); closeApp(); }
      return;
    }
    if (key === 461 || key === 27) {
      e.preventDefault();
      if (single) { single = false; render(); } else closeApp();
    } else if (key === 37 || key === 39) {
      e.preventDefault();
      if (single) single = false;
      var pages = Math.ceil(cameras.length / 4);
      if (pages) page = (page + (key === 39 ? 1 : -1) + pages) % pages;
      selected = 0;
      render();
    } else if (key === 38 || key === 40) {
      e.preventDefault();
      if (!single) {
        selected = (selected + (key === 40 ? 1 : 3)) % Math.min(4, cameras.length - page * 4);
        Array.prototype.forEach.call(grid.children, function (tile, i) {
          tile.classList.toggle('selected', i === selected);
        });
      }
    } else if (key === 13 && cameras.length) {
      e.preventDefault();
      single = !single;
      render();
    } else if (key === 405) {
      e.preventDefault();
      openSettings();
    }
  });

  document.addEventListener('webOSRelaunch', function (e) {
    applyParams(params(e.detail || (webos && webos.launchParams)));
  });
  applyParams(params(webos && webos.launchParams));
})();
