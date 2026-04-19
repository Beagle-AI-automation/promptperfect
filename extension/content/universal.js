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
    if (tag === 'input' && (type === 'text' || type === 'search' || type === 'email' || type === 'url'))
      return true;
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
      el.dispatchEvent(
        new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }),
      );
      return;
    }
    var proto =
      el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
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

  function showNotification(message, type) {
    const toast = document.createElement('div');
    toast.className = 'pp-toast pp-toast--' + (type === 'success' ? 'success' : 'error');
    toast.setAttribute('role', 'status');
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('pp-toast--visible'));
    setTimeout(() => {
      toast.classList.remove('pp-toast--visible');
      setTimeout(() => toast.remove(), 320);
    }, 3200);
  }

  function setButtonOptimizing(btn) {
    btn.disabled = true;
    btn.innerHTML =
      '<span class="pp-spinner" aria-hidden="true"></span><span class="pp-btn-label">Optimizing</span>';
    btn.setAttribute('aria-busy', 'true');
  }

  function setButtonReady(btn) {
    btn.disabled = false;
    btn.innerHTML =
      '<span class="pp-btn-label" aria-hidden="false">✨ Optimize</span>';
    btn.removeAttribute('aria-busy');
  }

  function flashButtonSuccess(btn) {
    btn.classList.add('pp-success-flash');
    setTimeout(() => btn.classList.remove('pp-success-flash'), 900);
  }

  function sendOptimizeMessage(text) {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage({ type: 'OPTIMIZE', text }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve(response);
        });
      } catch (e) {
        reject(e instanceof Error ? e : new Error('Extension error'));
      }
    });
  }

  function createButton() {
    var btn = document.getElementById(BUTTON_ID);
    if (btn) return btn;
    btn = document.createElement('button');
    btn.id = BUTTON_ID;
    btn.type = 'button';
    btn.className = 'pp-optimize-button';
    btn.innerHTML = '<span class="pp-btn-label">✨ Optimize</span>';
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

    btn.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const target = currentTarget;
      if (!target) return;
      const text = getTextFromElement(target);
      if (!text) return;

      setButtonOptimizing(btn);

      try {
        const response = await sendOptimizeMessage(text.trim());

        if (response && response.error) {
          showNotification('Optimization failed: ' + response.error, 'error');
          return;
        }

        if (response && response.optimizedText != null && response.optimizedText !== '') {
          setElementValue(target, response.optimizedText);
          flashButtonSuccess(btn);
          showNotification('Prompt optimized!', 'success');
        } else {
          showNotification('Optimization failed: empty response', 'error');
        }
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Could not reach PromptPerfect API';
        if (/Could not establish|Receiving end|Extension context/i.test(msg)) {
          showNotification('Could not reach PromptPerfect API. Reload the extension.', 'error');
        } else {
          showNotification('Could not reach PromptPerfect API', 'error');
        }
      } finally {
        setButtonReady(btn);
      }
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

  document.addEventListener(
    'focusin',
    (e) => {
      const el = e.target;
      if (isTextInput(el)) showButton(el);
    },
    true,
  );

  document.addEventListener(
    'focusout',
    (e) => {
      const el = e.target;
      const btn = document.getElementById(BUTTON_ID);
      const related = e.relatedTarget;
      if (btn && related && btn.contains(related)) return;
      if (el && isTextInput(el)) scheduleHide();
    },
    true,
  );

  observer = new MutationObserver(() => {
    if (!currentTarget) return;
    if (!document.contains(currentTarget)) {
      hideButton();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
