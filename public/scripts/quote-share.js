(function () {
  if (window.__binsQuoteShareState?.installed) return;

  const lifecycleState = {
    installed: true,
    root: null,
    cleanup: null,
  };
  window.__binsQuoteShareState = lifecycleState;

  function cleanupCurrent() {
    if (typeof lifecycleState.cleanup === "function") {
      lifecycleState.cleanup();
    }
    lifecycleState.cleanup = null;
    lifecycleState.root = null;
  }

  function initializeQuoteShare() {
    const root = document.getElementById("quote-share-root");
    if (!root) {
      cleanupCurrent();
      return;
    }
    if (lifecycleState.root === root && lifecycleState.cleanup) return;

    cleanupCurrent();
    lifecycleState.root = root;
    initializeCurrentQuoteShare(
      root,
      root.dataset.postTitle || "",
      root.dataset.postPubDate || ""
    );
  }

  function initializeCurrentQuoteShare(root, postTitle, postPubDate) {
    const QRCodeLib = (function () {
      function createQRCode(text) {
        return (
          "https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=4&data=" +
          encodeURIComponent(text)
        );
      }
      return { getQRUrl: createQRCode };
    })();

    let selectedQuote = "";
    let previousFocus = null;
    let previousBodyOverflow = "";
    let modalOpen = false;
    let rendering = false;
    const lastMousePos = { x: 0, y: 0 };
    const controller = new AbortController();
    const { signal } = controller;
    const pendingTimers = new Set();
    const quoteBtn = document.getElementById("quote-share-btn");
    const quoteModal = document.getElementById("quote-share-modal");
    const quoteImg = document.getElementById("quote-share-img");
    const closeBtn = document.getElementById("quote-share-close-btn");
    const copyBtn = document.getElementById("quote-copy-btn");
    const downloadBtn = document.getElementById("quote-download-btn");
    const backdrop = quoteModal?.querySelector(".quote-share-backdrop");
    const dialog = quoteModal?.querySelector(".quote-share-dialog");

    if (
      !quoteBtn ||
      !quoteModal ||
      !quoteImg ||
      !closeBtn ||
      !copyBtn ||
      !downloadBtn ||
      !backdrop ||
      !dialog
    ) {
      controller.abort();
      lifecycleState.root = null;
      return;
    }

    function schedule(callback, delay) {
      const timer = window.setTimeout(() => {
        pendingTimers.delete(timer);
        if (!signal.aborted) callback();
      }, delay);
      pendingTimers.add(timer);
    }

    function closeModal({ restoreFocus = true } = {}) {
      quoteModal.style.display = "none";
      quoteModal.setAttribute("aria-hidden", "true");
      if (modalOpen) document.body.style.overflow = previousBodyOverflow;
      modalOpen = false;
      if (
        restoreFocus &&
        previousFocus instanceof HTMLElement &&
        previousFocus.isConnected
      ) {
        previousFocus.focus();
      }
      previousFocus = null;
    }

    function cleanup() {
      if (signal.aborted) return;
      controller.abort();
      for (const timer of pendingTimers) window.clearTimeout(timer);
      pendingTimers.clear();
      closeModal({ restoreFocus: false });
      delete root.dataset.quoteShareReady;
    }

    lifecycleState.cleanup = cleanup;
    root.dataset.quoteShareReady = "true";

    // 记录鼠标实时落脚点
    document.addEventListener(
      "mousemove",
      e => {
        lastMousePos.x = e.clientX;
        lastMousePos.y = e.clientY;
      },
      { passive: true, signal }
    );

    // 1. 紧贴鼠标松开物理落点
    function handleSelection(pointerEvent) {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        quoteBtn.style.display = "none";
        return;
      }

      const text = selection.toString().trim();
      if (text.length < 2 || text.length > 600) {
        quoteBtn.style.display = "none";
        return;
      }

      const articleBody = document.querySelector(".article-body");
      if (!articleBody) return;

      const range = selection.getRangeAt(0);
      if (!articleBody.contains(range.commonAncestorContainer)) {
        quoteBtn.style.display = "none";
        return;
      }

      selectedQuote = text;

      let clientX = lastMousePos.x;
      let clientY = lastMousePos.y;

      if (pointerEvent && Number.isFinite(pointerEvent.clientX)) {
        clientX = pointerEvent.clientX;
        clientY = pointerEvent.clientY;
      } else if (
        pointerEvent &&
        pointerEvent.changedTouches &&
        pointerEvent.changedTouches.length > 0
      ) {
        clientX = pointerEvent.changedTouches[0].clientX;
        clientY = pointerEvent.changedTouches[0].clientY;
      }

      const rect = range.getBoundingClientRect();

      if (
        clientX < rect.left - 50 ||
        clientX > rect.right + 50 ||
        clientY < rect.top - 50 ||
        clientY > rect.bottom + 50
      ) {
        const clientRects = range.getClientRects();
        if (clientRects.length > 0) {
          const lastRect = clientRects[clientRects.length - 1];
          clientX = (lastRect.left + lastRect.right) / 2;
          clientY = lastRect.top;
        } else {
          clientX = rect.right;
          clientY = rect.bottom;
        }
      }

      let top = clientY - 42;
      let left = clientX;

      if (top < 50) {
        top = clientY + 24;
      }

      left = Math.max(56, Math.min(window.innerWidth - 56, left));

      quoteBtn.style.top = `${top}px`;
      quoteBtn.style.left = `${left}px`;
      quoteBtn.style.display = "inline-flex";
    }

    document.addEventListener(
      "mouseup",
      e => {
        schedule(() => handleSelection(e), 20);
      },
      { signal }
    );

    document.addEventListener(
      "touchend",
      e => {
        schedule(() => handleSelection(e), 100);
      },
      { passive: true, signal }
    );

    document.addEventListener(
      "selectionchange",
      () => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
          quoteBtn.style.display = "none";
        }
      },
      { signal }
    );

    function loadImage(src, { crossOrigin, timeout = 8000 } = {}) {
      return new Promise(resolve => {
        const img = new Image();
        let settled = false;
        const timer = window.setTimeout(() => finish(null), timeout);

        function finish(result) {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          img.onload = null;
          img.onerror = null;
          if (!result) img.src = "";
          resolve(result);
        }

        img.onload = () => finish(img);
        img.onerror = () => finish(null);
        signal.addEventListener("abort", () => finish(null), {
          once: true,
        });
        if (signal.aborted) {
          finish(null);
          return;
        }
        if (crossOrigin) img.crossOrigin = crossOrigin;
        img.src = src;
      });
    }

    async function waitForCardFont() {
      if (!document.fonts?.load) return;
      await Promise.race([
        document.fonts.load('500 21px "TsangerJinKai02"'),
        new Promise(resolve => window.setTimeout(resolve, 2500)),
      ]).catch(() => undefined);
    }

    // 2. 绘制 Kami 纯正纸质文摘卡片 (Canvas 2D)
    async function renderQuoteCard(quoteText) {
      await waitForCardFont();
      if (signal.aborted) return;

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = 2; // Retina 高清
      const width = 640;
      const padding = 40;
      const contentWidth = width - padding * 2;

      const fontSerif =
        "TsangerJinKai02, 'Songti SC', 'Noto Serif SC', SimSun, serif";
      ctx.font = `500 21px ${fontSerif}`;

      function getLines(text, maxWidth) {
        const words = text.split("");
        const lines = [];
        let currentLine = "";

        for (let i = 0; i < words.length; i++) {
          const char = words[i];
          if (char === "\n") {
            lines.push(currentLine);
            currentLine = "";
            continue;
          }
          const testLine = currentLine + char;
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && currentLine !== "") {
            lines.push(currentLine);
            currentLine = char;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) lines.push(currentLine);
        return lines;
      }

      const quoteLines = getLines(quoteText, contentWidth - 20);
      const lineHeight = 36;
      const quoteHeight = quoteLines.length * lineHeight;

      const headerHeight = 56;
      const footerAreaHeight = 96; // 紧凑舒适的底部高度
      const height = Math.max(
        460,
        padding + 16 + headerHeight + quoteHeight + 64 + footerAreaHeight + 16
      );

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);

      // A. 填充 Kami 暖纸底色
      ctx.fillStyle = "#f5f4ed";
      ctx.fillRect(0, 0, width, height);

      // B. 绘制发丝外边框 (紧凑贴合，四边留白均匀 16px)
      ctx.strokeStyle = "#e8e6dc";
      ctx.lineWidth = 1;
      ctx.strokeRect(16, 16, width - 32, height - 32);

      // C. 顶部 Eyebrow：站点官方 Logo SVG + BINS.BLOG + 日期
      const topY = 32;

      // 绘制站点 Logo
      const logoImg = await loadImage("/site-logo.svg", { timeout: 2500 });
      if (logoImg) ctx.drawImage(logoImg, padding, topY - 2, 20, 20);
      if (signal.aborted) return;

      // 站点名
      ctx.fillStyle = "#1B365D";
      ctx.font = `700 15px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
      ctx.letterSpacing = "0.08em";
      ctx.fillText("BINS.BLOG", padding + 26, topY + 13);

      // 日期
      ctx.fillStyle = "#7e796e";
      ctx.font = `500 13px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.textAlign = "right";
      ctx.fillText(postPubDate, width - padding, topY + 13);
      ctx.textAlign = "left";

      // 顶部发丝分割线
      ctx.strokeStyle = "#e8e6dc";
      ctx.beginPath();
      ctx.moveTo(padding, topY + 26);
      ctx.lineTo(width - padding, topY + 26);
      ctx.stroke();

      // D. 大号引号 ❝
      const quoteStartY = topY + 68;
      ctx.fillStyle = "#1B365D";
      ctx.font = `700 42px ${fontSerif}`;
      ctx.fillText("❝", padding, quoteStartY);

      // E. 正文内容
      ctx.fillStyle = "#141413";
      ctx.font = `500 20px ${fontSerif}`;
      let textY = quoteStartY + 38;

      for (let i = 0; i < quoteLines.length; i++) {
        ctx.fillText(quoteLines[i], padding + 10, textY);
        textY += lineHeight;
      }

      // F. 出处落款
      textY += 22;
      ctx.fillStyle = "#6b6a64";
      ctx.font = `500 15px ${fontSerif}`;
      ctx.textAlign = "right";
      ctx.fillText(`—— 摘自《${postTitle}》`, width - padding - 6, textY);
      ctx.textAlign = "left";

      // G. 底部发丝分割线
      const footerY = height - footerAreaHeight - 16;
      ctx.strokeStyle = "#e8e6dc";
      ctx.beginPath();
      ctx.moveTo(padding, footerY);
      ctx.lineTo(width - padding, footerY);
      ctx.stroke();

      // ==========================================
      // H & I. 底部区域：紧凑匀称排版 (中轴对齐 + 底部留白紧凑)
      // ==========================================
      const bottomAreaMidY = footerY + footerAreaHeight / 2;

      // 1. 右侧二维码：恢复为 70px 醒目大尺寸 (64px 二维码 + 3px 白边)
      const qrInnerSize = 64;
      const qrBoxPad = 3;
      const qrBoxSize = qrInnerSize + qrBoxPad * 2; // 70px
      const qrBoxX = width - padding - qrBoxSize;
      const qrBoxY = bottomAreaMidY - qrBoxSize / 2;
      const qrX = qrBoxX + qrBoxPad;
      const qrY = qrBoxY + qrBoxPad;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize);
      ctx.strokeStyle = "#ded9cc";
      ctx.lineWidth = 1;
      ctx.strokeRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize);

      const qrImg = await loadImage(QRCodeLib.getQRUrl(window.location.href), {
        crossOrigin: "anonymous",
        timeout: 8000,
      });
      if (signal.aborted) return;
      if (qrImg) {
        ctx.drawImage(qrImg, qrX, qrY, qrInnerSize, qrInnerSize);
      } else {
        ctx.fillStyle = "#8a867c";
        ctx.font = `400 11px -apple-system, sans-serif`;
        ctx.textAlign = "right";
        ctx.fillText("bins.blog", width - padding, bottomAreaMidY + 4);
        ctx.textAlign = "left";
      }

      // 2. 左侧朱砂印章：46px × 46px 精致文人方印 (与二维码中轴严格对齐)
      const sealSize = 46;
      const sealX = padding;
      const sealY = bottomAreaMidY - sealSize / 2;

      ctx.fillStyle = "#faf1f0";
      ctx.fillRect(sealX, sealY, sealSize, sealSize);
      ctx.strokeStyle = "#9c2727";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(sealX, sealY, sealSize, sealSize);
      ctx.strokeRect(sealX + 2, sealY + 2, sealSize - 4, sealSize - 4);

      ctx.fillStyle = "#9c2727";
      ctx.font = `700 11px ${fontSerif}`;
      ctx.fillText("摸鱼", sealX + 11, sealY + 18);
      ctx.fillText("时刻", sealX + 11, sealY + 34);

      // 3. 左侧文字注释 (与印章严格垂直居中呼应)
      ctx.fillStyle = "#1B365D";
      ctx.font = `500 14px ${fontSerif}`;
      ctx.letterSpacing = "0.04em";
      ctx.fillText("偶有所得", sealX + sealSize + 12, bottomAreaMidY - 5);

      ctx.fillStyle = "#8a867c";
      ctx.font = `400 12px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.letterSpacing = "0.02em";
      ctx.fillText(
        "扫码长按阅读全文",
        sealX + sealSize + 12,
        bottomAreaMidY + 14
      );

      return canvas.toDataURL("image/png");
    }

    // 3. 点击弹出卡片
    quoteBtn.addEventListener(
      "click",
      async e => {
        e.stopPropagation();
        if (rendering || !selectedQuote) return;

        rendering = true;
        quoteBtn.disabled = true;
        quoteBtn.setAttribute("aria-busy", "true");
        quoteBtn.style.display = "none";

        try {
          const dataUrl = await renderQuoteCard(selectedQuote);
          if (!dataUrl || signal.aborted) return;

          quoteImg.src = dataUrl;
          previousFocus = document.activeElement;
          previousBodyOverflow = document.body.style.overflow;
          quoteModal.style.display = "flex";
          quoteModal.setAttribute("aria-hidden", "false");
          document.body.style.overflow = "hidden";
          modalOpen = true;
          closeBtn.focus();
        } catch {
          alert("卡片生成失败，请稍后再试。");
        } finally {
          rendering = false;
          quoteBtn.disabled = false;
          quoteBtn.removeAttribute("aria-busy");
        }
      },
      { signal }
    );

    // 4. 关闭弹窗与键盘焦点管理
    closeBtn.addEventListener("click", () => closeModal(), { signal });
    backdrop.addEventListener("click", () => closeModal(), { signal });
    document.addEventListener(
      "keydown",
      e => {
        if (quoteModal.getAttribute("aria-hidden") === "true") return;
        if (e.key === "Escape") {
          e.preventDefault();
          closeModal();
          return;
        }
        if (e.key !== "Tab") return;

        const focusable = Array.from(
          dialog.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter(element => element instanceof HTMLElement);
        if (focusable.length === 0) {
          e.preventDefault();
          dialog.focus();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      },
      { signal }
    );

    // 5. 下载与复制动作
    downloadBtn.addEventListener(
      "click",
      () => {
        if (!quoteImg.src) return;
        const a = document.createElement("a");
        a.href = quoteImg.src;
        a.download = `文摘卡片-${Date.now()}.png`;
        a.click();
      },
      { signal }
    );

    copyBtn.addEventListener(
      "click",
      async () => {
        try {
          if (!quoteImg.src) return;
          const res = await fetch(quoteImg.src);
          const blob = await res.blob();
          await navigator.clipboard.write([
            new ClipboardItem({ [blob.type]: blob }),
          ]);
          const span = copyBtn.querySelector("span");
          if (span) {
            const original = span.textContent;
            span.textContent = "已复制！";
            schedule(() => (span.textContent = original), 2000);
          }
        } catch {
          alert("浏览器不支持直接复制图片，请长按或右键图片保存！");
        }
      },
      { signal }
    );
  }

  document.addEventListener("astro:before-swap", cleanupCurrent);
  document.addEventListener("astro:page-load", initializeQuoteShare);
  initializeQuoteShare();
})();
