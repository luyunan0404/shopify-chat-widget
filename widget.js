(function () {
  'use strict';

  // -- Config from script tag attributes --
  var script = document.currentScript;
  var API_URL = script.getAttribute('data-api-url') || 'http://localhost:8080';
  var API_KEY = script.getAttribute('data-api-key') || '';

  // -- State --
  var TIMEOUT_MS = 30 * 60 * 1000;

  function loadOrInitState() {
    var storedId = localStorage.getItem('scw_chat_id');
    var storedMsgs = localStorage.getItem('scw_messages');
    var lastActivity = parseInt(localStorage.getItem('scw_last_activity') || '0', 10);
    if (storedId && storedMsgs && (Date.now() - lastActivity) < TIMEOUT_MS) {
      try {
        return { chatId: storedId, messages: JSON.parse(storedMsgs) };
      } catch (e) {}
    }
    var newId = 'chat_' + Math.random().toString(36).substring(2, 11);
    localStorage.setItem('scw_chat_id', newId);
    localStorage.setItem('scw_messages', '[]');
    localStorage.setItem('scw_last_activity', String(Date.now()));
    return { chatId: newId, messages: [] };
  }

  function saveToStorage() {
    localStorage.setItem('scw_messages', JSON.stringify(messages));
    localStorage.setItem('scw_last_activity', String(Date.now()));
  }

  var state = loadOrInitState();
  var CHAT_ID = state.chatId;
  var messages = state.messages;
  var isOpen = false;
  var isLoading = false;

  // -- Load marked.js for markdown rendering --
  var markedScript = document.createElement('script');
  markedScript.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
  document.head.appendChild(markedScript);

  // -- Inject Styles --
  var style = document.createElement('style');
  style.textContent =
    '#scw-bubble{position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:50%;background:#2563eb;color:#fff;border:none;cursor:pointer;font-size:24px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(0,0,0,.15);z-index:99999;transition:background .2s}' +
    '#scw-bubble:hover{background:#1d4ed8}' +
    '#scw-window{position:fixed;bottom:88px;right:20px;width:370px;height:500px;background:#fff;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,.15);display:none;flex-direction:column;z-index:99999;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;overflow:hidden}' +
    '#scw-window.open{display:flex}' +
    '#scw-header{background:#2563eb;color:#fff;padding:14px 16px;font-size:15px;font-weight:600;display:flex;justify-content:space-between;align-items:center}' +
    '#scw-close{background:none;border:none;color:#fff;font-size:20px;cursor:pointer;padding:0;line-height:1}' +
    '#scw-messages{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px}' +
    '.scw-msg{max-width:80%;padding:8px 12px;border-radius:12px;font-size:14px;line-height:1.4;word-wrap:break-word}' +
    '.scw-msg.user{align-self:flex-end;background:#2563eb;color:#fff;border-bottom-right-radius:4px;white-space:pre-wrap}' +
    '.scw-msg.assistant{align-self:flex-start;background:#f1f5f9;color:#1e293b;border-bottom-left-radius:4px}' +
    '.scw-msg.assistant p{margin:0 0 6px}' +
    '.scw-msg.assistant p:last-child{margin-bottom:0}' +
    '.scw-msg.assistant ol,.scw-msg.assistant ul{margin:4px 0;padding-left:18px}' +
    '.scw-msg.assistant li{margin-bottom:4px}' +
    '.scw-msg.assistant img{max-width:100%;border-radius:6px;margin-top:4px;display:block}' +
    '.scw-msg.assistant strong{font-weight:600}' +
    '#scw-input-area{display:flex;padding:10px;border-top:1px solid #e2e8f0;gap:8px}' +
    '#scw-input{flex:1;border:1px solid #cbd5e1;border-radius:8px;padding:8px 12px;font-size:14px;outline:none;font-family:inherit;resize:none}' +
    '#scw-input:focus{border-color:#2563eb}' +
    '#scw-send{background:#2563eb;color:#fff;border:none;border-radius:8px;padding:8px 14px;cursor:pointer;font-size:14px;font-family:inherit}' +
    '#scw-send:disabled{background:#93c5fd;cursor:not-allowed}' +
    '.scw-typing{align-self:flex-start;color:#94a3b8;font-size:13px;padding:4px 0}';
  document.head.appendChild(style);

  // -- Build DOM --
  var bubble = document.createElement('button');
  bubble.id = 'scw-bubble';
  bubble.textContent = '\u{1F4AC}';
  bubble.onclick = toggleWindow;

  var win = document.createElement('div');
  win.id = 'scw-window';
  win.innerHTML =
    '<div id="scw-header"><span>Chat</span><button id="scw-close">\u00D7</button></div>' +
    '<div id="scw-messages"></div>' +
    '<div id="scw-input-area">' +
    '<input id="scw-input" type="text" placeholder="Type a message..." autocomplete="off" />' +
    '<button id="scw-send">Send</button>' +
    '</div>';

  document.body.appendChild(bubble);
  document.body.appendChild(win);

  var msgContainer = document.getElementById('scw-messages');
  var input = document.getElementById('scw-input');
  var sendBtn = document.getElementById('scw-send');

  document.getElementById('scw-close').onclick = toggleWindow;
  sendBtn.onclick = sendMessage;
  input.onkeydown = function (e) {
    if (e.key === 'Enter' && !isLoading) sendMessage();
  };

  renderMessages();

  // -- Functions --
  function toggleWindow() {
    isOpen = !isOpen;
    win.classList.toggle('open', isOpen);
    if (isOpen) input.focus();
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function renderMessages() {
    var html = '';
    for (var i = 0; i < messages.length; i++) {
      var content = messages[i].role === 'assistant' && window.marked
        ? window.marked.parse(messages[i].content)
        : escapeHtml(messages[i].content);
      html += '<div class="scw-msg ' + messages[i].role + '">' + content + '</div>';
    }
    if (isLoading) {
      html += '<div class="scw-typing">Typing\u2026</div>';
    }
    msgContainer.innerHTML = html;
    msgContainer.scrollTop = msgContainer.scrollHeight;
  }

  function buildApiMessages() {
    var apiMsgs = [{ role: 'system', content: 'chat_id:' + CHAT_ID }];
    for (var i = 0; i < messages.length; i++) {
      apiMsgs.push({ role: messages[i].role, content: messages[i].content });
    }
    return apiMsgs;
  }

  async function sendMessage() {
    var text = input.value.trim();
    if (!text || isLoading) return;

    messages.push({ role: 'user', content: text });
    saveToStorage();
    input.value = '';
    isLoading = true;
    sendBtn.disabled = true;
    renderMessages();

    var headers = { 'Content-Type': 'application/json' };
    if (API_KEY) headers['Authorization'] = 'Bearer ' + API_KEY;

    try {
      var res = await fetch(API_URL + '/chat/completions', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ messages: buildApiMessages() }),
      });

      if (!res.ok) throw new Error('HTTP ' + res.status);

      var data = await res.json();
      var reply = data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content
        : 'No response';
      messages.push({ role: 'assistant', content: reply });
      saveToStorage();
    } catch (err) {
      console.error('Chat widget error:', err);
      messages.push({ role: 'assistant', content: 'Sorry, something went wrong. Please try again.' });
      saveToStorage();
    }

    isLoading = false;
    sendBtn.disabled = false;
    renderMessages();
    input.focus();
  }
})();
