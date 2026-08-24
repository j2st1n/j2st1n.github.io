(function () {
  if (window.__binsThemeInstalled) return;
  window.__binsThemeInstalled = true;

  const storageKey = "theme";
  const light = "light";
  const dark = "dark";
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  let buttonController;

  function getStoredTheme() {
    try {
      const value = localStorage.getItem(storageKey);
      return value === light || value === dark ? value : null;
    } catch {
      return null;
    }
  }

  function getPreferredTheme() {
    return getStoredTheme() ?? (media.matches ? dark : light);
  }

  let themeValue =
    document.documentElement.dataset.theme || getPreferredTheme();

  function getToggleLabel() {
    return themeValue === light ? "切换到深色主题" : "切换到浅色主题";
  }

  function reflectPreference() {
    document.documentElement.dataset.theme = themeValue;

    const button = document.querySelector("#theme-btn");
    const label = getToggleLabel();
    button?.setAttribute("aria-label", label);
    button?.setAttribute("aria-pressed", String(themeValue === dark));
    button?.setAttribute("title", label);

    if (document.body) {
      const background = window.getComputedStyle(document.body).backgroundColor;
      document
        .querySelector("meta[name='theme-color']")
        ?.setAttribute("content", background);
    }
  }

  function savePreference() {
    try {
      localStorage.setItem(storageKey, themeValue);
    } catch {
      // The selected theme still applies when storage is unavailable.
    }
    reflectPreference();
  }

  function bindThemeButton() {
    buttonController?.abort();
    buttonController = new AbortController();
    document.querySelector("#theme-btn")?.addEventListener(
      "click",
      () => {
        themeValue = themeValue === light ? dark : light;
        savePreference();
      },
      { signal: buttonController.signal }
    );
    reflectPreference();
  }

  media.addEventListener("change", event => {
    if (getStoredTheme()) return;
    themeValue = event.matches ? dark : light;
    reflectPreference();
  });

  document.addEventListener("astro:before-swap", event => {
    const color = document
      .querySelector("meta[name='theme-color']")
      ?.getAttribute("content");
    if (color) {
      event.newDocument
        .querySelector("meta[name='theme-color']")
        ?.setAttribute("content", color);
    }
  });
  document.addEventListener("astro:page-load", bindThemeButton);
  bindThemeButton();
})();
