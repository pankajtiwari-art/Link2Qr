(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const form = $("qrForm");
  const urlInput = $("urlInput");
  const clearBtn = $("clearBtn");
  const sizeSelect = $("sizeSelect");
  const levelSelect = $("levelSelect");
  const colorInput = $("colorInput");
  const generateBtn = $("generateBtn");
  const statusEl = $("status");
  const resultEl = $("result");
  const qrTarget = $("qrTarget");
  const downloadBtn = $("downloadBtn");
  const copyBtn = $("copyBtn");
  const shareBtn = $("shareBtn");
  const themeToggle = $("themeToggle");
  const themeIcon = themeToggle.querySelector(".theme-icon");
  const exportCanvas = $("exportCanvas");
  const yearEl = $("year");

  let currentQR = null;
  let currentLink = "";
  let currentSize = 512;
  let currentColor = "#0b1020";

  const THEME_KEY = "link2qr-theme";

  function getPreferredTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    themeIcon.textContent = theme === "dark" ? "☀" : "☾";
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#070a14" : "#f6f7fb");
  }

  function toggleTheme() {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  }

  function setStatus(message, type) {
    statusEl.textContent = message || "";
    statusEl.classList.remove("error", "success");
    if (type) statusEl.classList.add(type);
  }

  function normalizeUrl(value) {
    let v = String(value || "").trim();
    if (!v) return "";
    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(v)) {
      v = "https://" + v;
    }
    return v;
  }

  function isValidUrl(value) {
    try {
      const u = new URL(value);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch (err) {
      return false;
    }
  }

  function updateClearVisibility() {
    clearBtn.hidden = urlInput.value.length === 0;
  }

  function setLoading(isLoading) {
    generateBtn.classList.toggle("is-loading", isLoading);
    generateBtn.disabled = isLoading;
  }

  function waitForLibrary(timeout) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      (function check() {
        if (typeof window.qrcode === "function") {
          resolve();
          return;
        }
        if (Date.now() - start > timeout) {
          reject(new Error("QR engine load nahi ho paya. Internet ya adblocker check karo."));
          return;
        }
        setTimeout(check, 60);
      })();
    });
  }

  function buildQR(text, level) {
    const qr = window.qrcode(0, level);
    qr.addData(text);
    qr.make();
    return qr;
  }

  function renderQR(qr, size, color) {
    const moduleCount = qr.getModuleCount();
    const scale = Math.max(1, Math.floor(size / moduleCount));
    const pixelSize = moduleCount * scale;

    const canvas = document.createElement("canvas");
    canvas.width = pixelSize;
    canvas.height = pixelSize;
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "Generated QR code for " + currentLink);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, pixelSize, pixelSize);

    ctx.fillStyle = color;
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (qr.isDark(row, col)) {
          ctx.fillRect(col * scale, row * scale, scale, scale);
        }
      }
    }

    qrTarget.innerHTML = "";
    qrTarget.appendChild(canvas);
    return canvas;
  }

  function getQrCanvas() {
    return qrTarget.querySelector("canvas");
  }

  function generate() {
    const raw = urlInput.value;
    const normalized = normalizeUrl(raw);

    if (!normalized) {
      setStatus("Pehle koi link daalo.", "error");
      urlInput.focus();
      return;
    }

    if (!isValidUrl(normalized)) {
      setStatus("Ye valid link nahi lagta. Check karke dobara try karo.", "error");
      urlInput.focus();
      return;
    }

    setLoading(true);
    setStatus("QR ban raha hai…");

    waitForLibrary(5000)
      .then(() => {
        const level = levelSelect.value;
        const size = parseInt(sizeSelect.value, 10) || 512;
        const color = colorInput.value || "#0b1020";

        currentQR = buildQR(normalized, level);
        currentLink = normalized;
        currentSize = size;
        currentColor = color;

        renderQR(currentQR, size, color);
        resultEl.hidden = false;
        setStatus("Ho gaya! QR ready hai.", "success");
      })
      .catch((err) => {
        resultEl.hidden = true;
        setStatus(err.message || "Kuch galat ho gaya.", "error");
      })
      .finally(() => {
        setLoading(false);
      });
  }

  function regenerateIfReady() {
    if (!currentQR || resultEl.hidden) return;
    try {
      const level = levelSelect.value;
      const size = parseInt(sizeSelect.value, 10) || 512;
      const color = colorInput.value || "#0b1020";
      currentQR = buildQR(currentLink, level);
      currentSize = size;
      currentColor = color;
      renderQR(currentQR, size, color);
      setStatus("QR update ho gaya.", "success");
    } catch (err) {
      setStatus("QR update nahi ho paya.", "error");
    }
  }

  function getExportCanvas() {
    const source = getQrCanvas();
    if (!source) return null;

    const pad = Math.round(currentSize * 0.08);
    const total = currentSize + pad * 2;

    exportCanvas.width = total;
    exportCanvas.height = total;
    const ctx = exportCanvas.getContext("2d");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, total, total);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(source, pad, pad, currentSize, currentSize);

    return exportCanvas;
  }

  function safeFileName() {
    let name = "qr-code";
    try {
      const u = new URL(currentLink);
      name = "qr-" + u.hostname.replace(/[^a-z0-9.-]/gi, "");
    } catch (err) {}
    return name + ".png";
  }

  function download() {
    const canvas = getExportCanvas();
    if (!canvas) {
      setStatus("Pehle QR generate karo.", "error");
      return;
    }

    if (canvas.toBlob) {
      canvas.toBlob((blob) => {
        if (!blob) {
          setStatus("Download fail ho gaya.", "error");
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = safeFileName();
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1500);
        setStatus("PNG download ho gaya.", "success");
      }, "image/png");
    } else {
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = safeFileName();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setStatus("PNG download ho gaya.", "success");
    }
  }

  function copyImage() {
    const canvas = getExportCanvas();
    if (!canvas) {
      setStatus("Pehle QR generate karo.", "error");
      return;
    }

    if (!navigator.clipboard || typeof window.ClipboardItem === "undefined") {
      setStatus("Ye browser image copy support nahi karta.", "error");
      return;
    }

    canvas.toBlob((blob) => {
      if (!blob) {
        setStatus("Copy fail ho gaya.", "error");
        return;
      }
      const item = new ClipboardItem({ "image/png": blob });
      navigator.clipboard
        .write([item])
        .then(() => setStatus("Image clipboard me copy ho gayi.", "success"))
        .catch(() => setStatus("Copy permission nahi mili.", "error"));
    }, "image/png");
  }

  function share() {
    if (!currentLink) {
      setStatus("Pehle QR generate karo.", "error");
      return;
    }

    const canvas = getExportCanvas();
    if (!canvas) {
      setStatus("Pehle QR generate karo.", "error");
      return;
    }

    if (!navigator.share) {
      setStatus("Is device par share support nahi hai.", "error");
      return;
    }

    canvas.toBlob((blob) => {
      if (!blob) {
        setStatus("Share fail ho gaya.", "error");
        return;
      }

      const file = new File([blob], safeFileName(), { type: "image/png" });
      const shareData = {
        title: "QR Code",
        text: currentLink,
        url: currentLink,
        files: [file]
      };

      if (navigator.canShare && !navigator.canShare({ files: [file] })) {
        delete shareData.files;
      }

      navigator
        .share(shareData)
        .then(() => setStatus("Share ho gaya.", "success"))
        .catch((err) => {
          if (err && err.name === "AbortError") {
            setStatus("");
            return;
          }
          setStatus("Share cancel ho gaya.", "");
        });
    }, "image/png");
  }

  function clearAll() {
    urlInput.value = "";
    updateClearVisibility();
    resultEl.hidden = true;
    qrTarget.innerHTML = "";
    currentQR = null;
    currentLink = "";
    setStatus("");
    urlInput.focus();
  }

  function init() {
    applyTheme(getPreferredTheme());
    yearEl.textContent = new Date().getFullYear();
    updateClearVisibility();

    themeToggle.addEventListener("click", toggleTheme);

    urlInput.addEventListener("input", updateClearVisibility);

    urlInput.addEventListener("paste", () => {
      setTimeout(updateClearVisibility, 0);
    });

    clearBtn.addEventListener("click", clearAll);

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      generate();
    });

    sizeSelect.addEventListener("change", regenerateIfReady);
    levelSelect.addEventListener("change", regenerateIfReady);
    colorInput.addEventListener("input", () => {
      if (currentQR && !resultEl.hidden) {
        const c = colorInput.value || "#0b1020";
        currentColor = c;
        renderQR(currentQR, currentSize, c);
      }
    });

    downloadBtn.addEventListener("click", download);
    copyBtn.addEventListener("click", copyImage);
    shareBtn.addEventListener("click", share);

    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
      if (!localStorage.getItem(THEME_KEY)) {
        applyTheme(e.matches ? "dark" : "light");
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
