function loadGiscus(): void {
  const shell = document.querySelector("[data-giscus-shell]");
  if (!(shell instanceof HTMLElement)) return;

  const config = JSON.parse(shell.dataset.giscusConfig ?? "{}");
  if (!config.repo || !config.repoId || !config.category || !config.categoryId)
    return;

  shell.replaceChildren();

  const script = document.createElement("script");
  script.src = "https://giscus.app/client.js";
  script.async = true;
  script.crossOrigin = "anonymous";
  script.dataset.repo = config.repo;
  script.dataset.repoId = config.repoId;
  script.dataset.category = config.category;
  script.dataset.categoryId = config.categoryId;
  script.dataset.mapping = config.mapping;
  script.dataset.strict = config.strict;
  script.dataset.reactionsEnabled = config.reactionsEnabled;
  script.dataset.emitMetadata = config.emitMetadata;
  script.dataset.inputPosition = config.inputPosition;
  script.dataset.theme =
    document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  script.dataset.lang = config.lang;
  script.dataset.loading = config.loading;
  script.dataset.term = config.term;
  script.dataset.origin = config.origin;

  shell.appendChild(script);
}

loadGiscus();
document.addEventListener("astro:page-load", loadGiscus);
