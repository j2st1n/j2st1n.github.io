(function () {
  if (window.__binsNotesReviewInstalled) return;
  window.__binsNotesReviewInstalled = true;

  let cleanup;

  function initReview() {
    const root = document.querySelector("[data-notes-review-root]");
    if (!root || root.dataset.reviewReady === "true") return;
    cleanup?.();
    root.dataset.reviewReady = "true";

    const login = root.querySelector("[data-review-login]");
    const tokenInput = root.querySelector("[data-review-token]");
    const status = root.querySelector("[data-review-status]");
    const list = root.querySelector("[data-review-list]");
    const empty = root.querySelector("[data-review-empty]");
    const filters = [...root.querySelectorAll("[data-review-filter]")];
    if (!login || !tokenInput || !status || !list || !empty) return;

    const controller = new AbortController();
    const localApi = ["localhost", "127.0.0.1"].includes(
      window.location.hostname
    )
      ? "http://127.0.0.1:8787/api/admin/notes"
      : "https://bins-claps.justinforgg.workers.dev/api/admin/notes";
    const apiBase = window.__NOTES_ADMIN_API_URL__ || localApi;
    let token = "";
    let activeStatus = "pending";

    function setStatus(message, isError = false) {
      status.textContent = message;
      status.style.color = isError ? "#a33a32" : "";
    }

    function formatDate(timestamp) {
      return new Intl.DateTimeFormat("zh-CN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(timestamp));
    }

    async function decide(id, decision, button) {
      button.disabled = true;
      try {
        const response = await fetch(`${apiBase}/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: decision }),
          signal: controller.signal,
        });
        if (response.status === 401) {
          token = "";
          tokenInput.value = "";
          throw new Error("审核令牌不正确，请重新输入。");
        }
        if (!response.ok) throw new Error(`操作失败（${response.status}）`);
        await loadQueue();
      } catch (error) {
        if (error?.name !== "AbortError") {
          setStatus(error?.message || "操作失败。", true);
        }
      } finally {
        button.disabled = false;
      }
    }

    function createCard(note) {
      const item = document.createElement("li");
      item.className = "review-card";

      const body = document.createElement("p");
      body.className = "review-body";
      body.textContent = note.body;
      item.append(body);

      const meta = document.createElement("p");
      meta.className = "review-meta";
      const nickname = document.createElement("span");
      nickname.textContent = note.nickname || "路过的人";
      const time = document.createElement("time");
      time.dateTime = new Date(note.createdAt).toISOString();
      time.textContent = formatDate(note.createdAt);
      meta.append(nickname, time);

      const visibility = document.createElement("span");
      visibility.className = "review-visibility";
      visibility.textContent = note.isPublic ? "公开纸条" : "仅主人可见";
      meta.append(visibility);
      item.append(meta);

      const actions = document.createElement("div");
      actions.className = "review-actions";
      const decisions = [
        ["approved", note.isPublic ? "通过并公开" : "收下", "review-approve"],
        ["rejected", "拒绝", "review-reject"],
        ["hidden", "隐藏", "review-hide"],
      ];
      for (const [decision, label, className] of decisions) {
        if (decision === note.status) continue;
        if (
          decision === "hidden" &&
          !(note.status === "approved" && note.isPublic)
        ) {
          continue;
        }
        const button = document.createElement("button");
        button.type = "button";
        button.className = className;
        button.textContent = label;
        button.addEventListener(
          "click",
          () => void decide(note.id, decision, button),
          { signal: controller.signal }
        );
        actions.append(button);
      }
      item.append(actions);
      return item;
    }

    async function loadQueue() {
      if (!token) return;
      setStatus("正在读取……");
      empty.textContent = "";
      try {
        const url = new URL(apiBase);
        url.searchParams.set("status", activeStatus);
        url.searchParams.set("limit", "50");
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          signal: controller.signal,
        });
        if (response.status === 401) {
          token = "";
          tokenInput.value = "";
          throw new Error("审核令牌不正确，请重新输入。");
        }
        if (!response.ok) throw new Error(`读取失败（${response.status}）`);
        const data = await response.json();
        const notes = Array.isArray(data.notes) ? data.notes : [];
        list.replaceChildren(...notes.map(createCard));
        empty.textContent = notes.length === 0 ? "这个队列是空的。" : "";
        setStatus(`已读取 ${notes.length} 张纸条。`);
      } catch (error) {
        if (error?.name !== "AbortError") {
          list.replaceChildren();
          empty.textContent = "";
          setStatus(error?.message || "读取失败。", true);
        }
      }
    }

    login.addEventListener(
      "submit",
      event => {
        event.preventDefault();
        token = tokenInput.value.trim();
        if (token) void loadQueue();
      },
      { signal: controller.signal }
    );

    for (const filter of filters) {
      filter.addEventListener(
        "click",
        () => {
          activeStatus = filter.dataset.reviewFilter || "pending";
          for (const item of filters) {
            item.setAttribute("aria-pressed", String(item === filter));
          }
          if (token) void loadQueue();
        },
        { signal: controller.signal }
      );
    }

    cleanup = () => {
      controller.abort();
      token = "";
      delete root.dataset.reviewReady;
      cleanup = undefined;
    };
  }

  document.addEventListener("astro:before-swap", () => cleanup?.());
  document.addEventListener("astro:page-load", initReview);
  initReview();
})();
