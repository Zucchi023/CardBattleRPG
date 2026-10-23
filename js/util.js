window.CBR = window.CBR || {};

CBR.util = {
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },

  randInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  },

  pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  },

  uid(prefix) {
    const rand = (window.crypto && crypto.randomUUID)
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
    return `${prefix}_${Date.now().toString(36)}${rand}`;
  },

  escape(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },

  wait(ms) {
    return new Promise(r => setTimeout(r, ms));
  },
};
