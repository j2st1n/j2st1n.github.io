(function () {
  if (window.__binsArticleInstalled) return;
  window.__binsArticleInstalled = true;

  let cleanupCurrent;

  function initArticle() {
    const article = document.querySelector("#article");
    if (!article) return;

    cleanupCurrent?.();
    const controller = new AbortController();
    const timers = new Set();
    let observer;

    function schedule(callback, delay) {
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        if (!controller.signal.aborted) callback();
      }, delay);
      timers.add(timer);
    }

    function createProgressBar() {
      if (document.querySelector("[data-article-progress]")) return;
      const container = document.createElement("div");
      container.className = "fixed top-0 z-10 h-px w-full bg-background";
      container.setAttribute("data-article-progress", "");

      const bar = document.createElement("div");
      bar.className = "article-progress-bar h-px w-0";
      bar.id = "article-progress-bar";
      container.appendChild(bar);
      document.body.appendChild(container);
    }

    function updateScrollProgress() {
      const scrollTop =
        document.body.scrollTop || document.documentElement.scrollTop;
      const height =
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight;
      const progress = height > 0 ? (scrollTop / height) * 100 : 0;
      const bar = document.getElementById("article-progress-bar");
      if (bar) bar.style.width = `${progress}%`;
    }

    function addHeadingLinks() {
      const headings = article.querySelectorAll("h2, h3, h4, h5, h6");
      for (const heading of headings) {
        if (heading.querySelector(".heading-link")) continue;
        const headingText = heading.textContent?.trim() || "本节";
        heading.classList.add("group");
        heading.setAttribute("aria-label", headingText);

        const link = document.createElement("a");
        link.className =
          "heading-link ms-2 no-underline opacity-60 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100";
        link.href = `#${heading.id}`;
        link.setAttribute("aria-label", `链接到“${headingText}”`);

        const marker = document.createElement("span");
        marker.ariaHidden = "true";
        marker.textContent = "#";
        link.appendChild(marker);
        heading.appendChild(link);
      }
    }

    function attachCopyButtons() {
      for (const codeBlock of article.querySelectorAll("pre")) {
        if (codeBlock.querySelector(".copy-code")) continue;
        codeBlock.style.position = "relative";

        const button = document.createElement("button");
        button.type = "button";
        button.className =
          "copy-code absolute end-3 top-3 rounded border border-muted bg-muted px-2 py-1 text-xs leading-4 text-foreground";
        button.textContent = "复制";
        button.setAttribute("aria-live", "polite");
        button.addEventListener(
          "click",
          async () => {
            try {
              const code = codeBlock.querySelector("code")?.textContent ?? "";
              await navigator.clipboard.writeText(code);
              button.textContent = "已复制";
            } catch {
              button.textContent = "复制失败";
            }
            schedule(() => (button.textContent = "复制"), 700);
          },
          { signal: controller.signal }
        );
        codeBlock.appendChild(button);
      }
    }

    function wrapTables() {
      for (const table of article.querySelectorAll("table")) {
        if (table.parentElement?.classList.contains("table-wrapper")) continue;
        const wrapper = document.createElement("div");
        wrapper.className = "table-wrapper";
        table.parentNode?.insertBefore(wrapper, table);
        wrapper.appendChild(table);
      }
    }

    function initTocScrollSpy() {
      const tocLinks = Array.from(document.querySelectorAll(".article-toc a"));
      const headings = Array.from(article.querySelectorAll("h2, h3"));
      if (tocLinks.length === 0 || headings.length === 0) return;

      const linkMap = new Map();
      for (const link of tocLinks) {
        const href = link.getAttribute("href");
        if (href?.startsWith("#")) {
          linkMap.set(decodeURIComponent(href.slice(1)), link);
        }
      }

      observer = new IntersectionObserver(
        entries => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            for (const link of tocLinks) link.classList.remove("active");
            linkMap.get(entry.target.id)?.classList.add("active");
          }
        },
        { rootMargin: "-80px 0px -70% 0px", threshold: 0 }
      );
      for (const heading of headings) {
        if (heading.id) observer.observe(heading);
      }
    }

    createProgressBar();
    window.addEventListener("scroll", updateScrollProgress, {
      passive: true,
      signal: controller.signal,
    });
    updateScrollProgress();
    addHeadingLinks();
    attachCopyButtons();
    wrapTables();
    initTocScrollSpy();

    cleanupCurrent = () => {
      controller.abort();
      observer?.disconnect();
      for (const timer of timers) window.clearTimeout(timer);
      timers.clear();
      cleanupCurrent = undefined;
    };
  }

  document.addEventListener("astro:before-swap", () => cleanupCurrent?.());
  document.addEventListener("astro:page-load", initArticle);
  initArticle();
})();
