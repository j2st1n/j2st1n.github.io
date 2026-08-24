(function () {
  if (window.__binsClapsInstalled) return;
  window.__binsClapsInstalled = true;

  let cleanupCurrent;

  function initClaps() {
    const root = document.querySelector("[data-claps-root]");
    if (!root || root.dataset.clapsReady === "true") return;

    cleanupCurrent?.();
    const slug = root.dataset.slug;
    const button = root.querySelector("[data-clap-button]");
    const countEl = root.querySelector("[data-clap-count]");
    const bubbleEl = root.querySelector("[data-clap-bubble]");
    const hintEl = root.querySelector("[data-claps-hint]");
    if (!slug || !button || !countEl || !bubbleEl || !hintEl) return;

    root.dataset.clapsReady = "true";
    const controller = new AbortController();
    const apiUrl =
      window.__CLAPS_API_URL__ || "https://claps.bins.blog/api/claps";
    const storageKey = `claps_total_${slug}`;
    const userClappedKey = `user_claps_${slug}`;
    const maxClapsPerUser = 10;
    let currentTotal = 0;
    let pendingIncrement = 0;
    let syncTimeout;

    function getStoredNumber(key) {
      try {
        return Number.parseInt(localStorage.getItem(key) || "0", 10);
      } catch {
        return 0;
      }
    }

    function storeNumber(key, value) {
      try {
        localStorage.setItem(key, String(value));
      } catch {
        // Keep the interaction usable when storage is unavailable.
      }
    }

    function getUserClappedCount() {
      return getStoredNumber(userClappedKey);
    }

    function checkButtonState() {
      const userClapped = getUserClappedCount();
      button.classList.toggle("stamped", userClapped > 0);
      if (userClapped >= maxClapsPerUser) {
        button.classList.add("max-clapped");
        button.title = "今天已摸满 10 条鱼啦";
        hintEl.textContent = "今天已摸满 10 条鱼";
        hintEl.classList.add("maxed");
      }
    }

    function fallbackLocalRead() {
      currentTotal = Math.max(currentTotal, getStoredNumber(storageKey));
      countEl.textContent = String(currentTotal);
    }

    async function fetchClaps() {
      try {
        const response = await fetch(
          `${apiUrl}?slug=${encodeURIComponent(slug)}`,
          {
            headers: { Accept: "application/json" },
            signal: controller.signal,
          }
        );
        if (!response.ok) {
          fallbackLocalRead();
          return;
        }
        const data = await response.json();
        if (typeof data.claps === "number") {
          currentTotal = data.claps;
          countEl.textContent = String(currentTotal);
          storeNumber(storageKey, currentTotal);
        }
      } catch (error) {
        if (error?.name !== "AbortError") fallbackLocalRead();
      } finally {
        checkButtonState();
      }
    }

    async function syncClaps() {
      if (pendingIncrement <= 0) return;
      const count = pendingIncrement;
      pendingIncrement = 0;

      try {
        const response = await fetch(
          `${apiUrl}?slug=${encodeURIComponent(slug)}&action=clap&count=${count}`,
          {
            headers: { Accept: "application/json" },
            signal: controller.signal,
          }
        );
        if (!response.ok) return;
        const data = await response.json();
        if (typeof data.claps === "number") {
          currentTotal = data.claps;
          countEl.textContent = String(currentTotal);
          storeNumber(storageKey, currentTotal);
        }
      } catch {
        // The optimistic local total remains visible when the network fails.
      }
    }

    button.addEventListener(
      "click",
      () => {
        const alreadyClapped = getUserClappedCount();
        if (alreadyClapped >= maxClapsPerUser) {
          button.classList.remove("shake");
          void button.offsetWidth;
          button.classList.add("shake");
          hintEl.textContent = "今天已摸满 10 条鱼啦";
          hintEl.classList.add("maxed");
          return;
        }

        const nextClapped = alreadyClapped + 1;
        storeNumber(userClappedKey, nextClapped);
        currentTotal += 1;
        pendingIncrement += 1;
        countEl.textContent = String(currentTotal);
        storeNumber(storageKey, currentTotal);

        button.classList.add("stamped");
        if (nextClapped >= maxClapsPerUser) {
          button.classList.add("max-clapped");
          button.title = "今天已摸满 10 条鱼啦";
          hintEl.textContent = "今天已摸满 10 条鱼";
          hintEl.classList.add("maxed");
        }

        bubbleEl.textContent = "+1";
        bubbleEl.classList.remove("pop");
        void bubbleEl.offsetWidth;
        bubbleEl.classList.add("pop");

        window.clearTimeout(syncTimeout);
        syncTimeout = window.setTimeout(() => {
          bubbleEl.classList.remove("pop");
          void syncClaps();
        }, 800);
      },
      { signal: controller.signal }
    );

    cleanupCurrent = () => {
      window.clearTimeout(syncTimeout);
      if (pendingIncrement > 0) {
        const count = pendingIncrement;
        pendingIncrement = 0;
        void fetch(
          `${apiUrl}?slug=${encodeURIComponent(slug)}&action=clap&count=${count}`,
          {
            headers: { Accept: "application/json" },
            keepalive: true,
          }
        ).catch(() => undefined);
      }
      controller.abort();
      delete root.dataset.clapsReady;
      cleanupCurrent = undefined;
    };

    void fetchClaps();
  }

  document.addEventListener("astro:before-swap", () => cleanupCurrent?.());
  document.addEventListener("astro:page-load", initClaps);
  initClaps();
})();
