(function () {
  if (window.__binsNotesInstalled) return;
  window.__binsNotesInstalled = true;

  const activeControllers = new Set();

  function formatDate(timestamp) {
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(timestamp));
  }

  function makeNoteCard(note) {
    const item = document.createElement("li");
    item.className = "note-card";

    const body = document.createElement("p");
    body.className = "note-body";
    body.textContent = note.body;
    item.append(body);

    const meta = document.createElement("p");
    meta.className = "note-meta";

    const nickname = document.createElement("span");
    nickname.textContent = note.nickname || "路过的人";
    meta.append(nickname);

    const time = document.createElement("time");
    time.dateTime = new Date(note.createdAt).toISOString();
    time.textContent = formatDate(note.createdAt);
    meta.append(time);

    item.append(meta);
    return item;
  }

  function initNotes() {
    document.querySelectorAll("[data-notes-root]").forEach(root => {
      if (root.dataset.notesReady === "true") return;
      root.dataset.notesReady = "true";

      const form = root.querySelector("[data-notes-form]");
      const bodyInput = root.querySelector("[data-notes-body]");
      const nicknameInput = root.querySelector("[data-notes-nickname]");
      const publicInput = root.querySelector("[data-notes-public]");
      const count = root.querySelector("[data-notes-count]");
      const status = root.querySelector("[data-notes-status]");
      const submit = root.querySelector("[data-notes-submit]");
      const loading = root.querySelector("[data-notes-loading]");
      const list = root.querySelector("[data-notes-list]");
      const more = root.querySelector("[data-notes-more]");
      if (
        !form ||
        !bodyInput ||
        !nicknameInput ||
        !publicInput ||
        !count ||
        !status ||
        !submit ||
        !loading ||
        !list ||
        !more
      ) {
        return;
      }

      const controller = new AbortController();
      activeControllers.add(controller);
      const localApi = ["localhost", "127.0.0.1"].includes(
        window.location.hostname
      )
        ? "http://127.0.0.1:8787/api/notes"
        : "https://claps.bins.blog/api/notes";
      const apiBase = window.__NOTES_API_URL__ || localApi;
      const limit = 20;
      let nextCursor = null;

      try {
        nicknameInput.value = localStorage.getItem("bins_notes_nickname") || "";
      } catch {
        // Private browsing can make localStorage unavailable.
      }

      function updateCount() {
        count.textContent = `${Array.from(bodyInput.value).length} / 120`;
      }

      function setStatus(message, state = "") {
        status.textContent = message;
        if (state) status.dataset.state = state;
        else delete status.dataset.state;
      }

      async function loadNotes(append = false) {
        more.disabled = true;
        if (!append) loading.textContent = "正在翻留言簿……";

        const url = new URL(apiBase);
        url.searchParams.set("limit", String(limit));
        if (append && nextCursor) url.searchParams.set("before", nextCursor);

        try {
          const response = await fetch(url, {
            cache: "no-store",
            headers: { Accept: "application/json" },
            signal: controller.signal,
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const data = await response.json();
          const notes = Array.isArray(data.notes) ? data.notes : [];
          if (!append) list.replaceChildren();
          for (const note of notes) {
            list.append(makeNoteCard(note));
          }
          nextCursor =
            typeof data.nextCursor === "string" ? data.nextCursor : null;
          more.hidden = !nextCursor;
          loading.textContent =
            list.children.length === 0 ? "这里还没有公开纸条。" : "";
        } catch (error) {
          if (error?.name !== "AbortError") {
            loading.textContent = "留言簿暂时没翻开，稍后再试。";
          }
        } finally {
          more.disabled = false;
        }
      }

      bodyInput.addEventListener("input", updateCount, {
        signal: controller.signal,
      });
      more.addEventListener(
        "click",
        () => {
          if (nextCursor) void loadNotes(true);
        },
        { signal: controller.signal }
      );
      form.addEventListener(
        "submit",
        async event => {
          event.preventDefault();
          const body = bodyInput.value.trim();
          if (!body) {
            setStatus("先写一句话吧。", "error");
            bodyInput.focus();
            return;
          }
          if (Array.from(body).length > 120) {
            setStatus("纸条最多 120 个字。", "error");
            return;
          }

          submit.disabled = true;
          submit.textContent = "正在收好……";
          setStatus("");
          const fields = new FormData(form);
          try {
            const response = await fetch(apiBase, {
              method: "POST",
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                body,
                nickname: nicknameInput.value.trim(),
                isPublic: publicInput.checked,
                website: fields.get("website") || "",
              }),
              signal: controller.signal,
            });
            if (response.status === 429) {
              setStatus("写得有点快，十分钟后再来吧。", "error");
              return;
            }
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            try {
              localStorage.setItem(
                "bins_notes_nickname",
                nicknameInput.value.trim()
              );
            } catch {
              // Submission still succeeds if storage is blocked.
            }
            bodyInput.value = "";
            updateCount();
            setStatus(
              publicInput.checked
                ? "纸条收到了，审核后会出现在这里。"
                : "纸条收到了，只会留给主人看。",
              "success"
            );
          } catch (error) {
            if (error?.name !== "AbortError") {
              setStatus("纸条没有送到，请稍后再试。", "error");
            }
          } finally {
            submit.disabled = false;
            submit.textContent = "传个纸条";
          }
        },
        { signal: controller.signal }
      );

      updateCount();
      void loadNotes();
    });
  }

  document.addEventListener("astro:before-swap", () => {
    for (const controller of activeControllers) controller.abort();
    activeControllers.clear();
  });
  document.addEventListener("astro:page-load", initNotes);
  initNotes();
})();
