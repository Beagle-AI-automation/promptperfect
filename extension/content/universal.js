(function () {
  'use strict';

  const BUTTON_ID = 'pp-optimize-btn';
  let hideTimeout = null;
  let currentTarget = null;
  let observer = null;

  function isTextInput(el) {
    if (!el || !el.tagName) return false;
    const tag = el.tagName.toLowerCase();
    const type = (el.type || '').toLowerCase();
    if (tag === 'textarea') return true;
    if (tag === 'input' && (type === 'text' || type === 'search' || type === 'email' || type === 'url')) return true;
    if (el.isContentEditable) return true;
    return false;
  }

  function getTextFromElement(el) {
    if (el.isContentEditable) {
      return (el.innerText || el.textContent || '').trim();
    }
    return (el.value || '').trim();
  }

  function setElementValue(el, text) {
    if (el.isContentEditable) {
      el.focus();
      try {
        var sel = window.getSelection();
        var range = document.createRange();
        range.selectNodeContents(el);
        sel.removeAllRanges();
        sel.addRange(range);
        document.execCommand('delete', false, null);
        document.execCommand('insertText', false, text);
      } catch (e1) {
        try {
          el.innerText = text;
          el.textContent = text;
        } catch (e2) {
          el.textContent = text;
        }
      }
      el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
      return;
    }
    var proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    var descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
    if (descriptor && descriptor.set) {
      var nativeSetter = descriptor.set;
      nativeSetter.call(el, text);
      el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      el.value = text;
      el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function getButtonPosition(el) {
    const rect = el.getBoundingClientRect();
    return {
      top: rect.bottom + 6,
      left: rect.left,
    };
  }

  function showButtonError(btn, message) {
    btn.textContent = 'Error';
    btn.title = message || 'Something went wrong';
    setTimeout(function () {
      if (btn && btn.textContent === 'Error') {
        btn.textContent = '✨ Optimize';
        btn.title = '';
      }
    }, 3000);
  }

  function createButton() {
    var btn = document.getElementById(BUTTON_ID);
    if (btn) return btn;
    btn = document.createElement('button');
    btn.id = BUTTON_ID;
    btn.type = 'button';
    btn.className = 'pp-optimize-button';
    btn.textContent = '✨ Optimize';
    btn.setAttribute('aria-label', 'Optimize prompt with PromptPerfect');
    return btn;
  }

  function showButton(el) {
    if (!el || !isTextInput(el)) return;
    clearTimeout(hideTimeout);
    hideTimeout = null;

    let btn = createButton();
    if (btn.parentNode) btn.remove();

    const updatePosition = () => {
      if (!currentTarget || !document.contains(currentTarget)) return;
      const pos = getButtonPosition(currentTarget);
      btn.style.position = 'fixed';
      btn.style.top = pos.top + 'px';
      btn.style.left = pos.left + 'px';
    };

    currentTarget = el;
    updatePosition();
    document.body.appendChild(btn);

    const scrollOrResize = () => {
      if (currentTarget === el) updatePosition();
    };
    window.addEventListener('scroll', scrollOrResize, true);
    window.addEventListener('resize', scrollOrResize);

    btn._cleanup = () => {
      window.removeEventListener('scroll', scrollOrResize, true);
      window.removeEventListener('resize', scrollOrResize);
    };

    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const target = currentTarget;
      if (!target) return;
      const text = getTextFromElement(target);
      if (!text) return;
      btn.disabled = true;
      btn.textContent = '…';
      chrome.runtime.sendMessage({ type: 'OPTIMIZE', text }, (response) => {
        btn.disabled = false;
        btn.textContent = '✨ Optimize';
        if (chrome.runtime.lastError) {
          showButtonError(btn, chrome.runtime.lastError.message);
          return;
        }
        if (response && response.optimizedText != null) {
          setElementValue(target, response.optimizedText);
        } else if (response && response.error) {
          showButtonError(btn, response.error);
        } else {
          showButtonError(btn, 'No response from API');
        }
      });
    };

    btn.onmouseenter = () => clearTimeout(hideTimeout);
    btn.onmouseleave = () => {
      if (currentTarget === el) {
        hideTimeout = setTimeout(hideButton, 200);
      }
    };
  }

  function hideButton() {
    hideTimeout = null;
    const btn = document.getElementById(BUTTON_ID);
    if (btn && btn._cleanup) btn._cleanup();
    if (btn && btn.parentNode) btn.remove();
    currentTarget = null;
  }

  function scheduleHide() {
    clearTimeout(hideTimeout);
    hideTimeout = setTimeout(hideButton, 200);
  }

  document.addEventListener('focusin', (e) => {
    const el = e.target;
    if (isTextInput(el)) showButton(el);
  }, true);

  document.addEventListener('focusout', (e) => {
    const el = e.target;
    const btn = document.getElementById(BUTTON_ID);
    const related = e.relatedTarget;
    if (btn && related && btn.contains(related)) return;
    if (el && isTextInput(el)) scheduleHide();
  }, true);

  observer = new MutationObserver((mutations) => {
    if (!currentTarget) return;
    if (!document.contains(currentTarget)) {
      hideButton();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
