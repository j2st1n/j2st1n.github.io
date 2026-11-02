const initialized = new WeakSet<HTMLMediaElement>();

export function initArticleMedia(root: ParentNode = document): void {
  for (const media of root.querySelectorAll<HTMLMediaElement>(
    "#article video, #article audio"
  )) {
    // ClientRouter adopts a DOMParser document. An adopted player can remain
    // uninitialized even though its src attribute is already present.
    // Leave selected or playable players alone; never reset playback. A parser
    // document may have already raised MEDIA_ERR_SRC_NOT_SUPPORTED with no src
    // selected, so load() must also recover that initial selection failure.
    if (
      initialized.has(media) ||
      media.readyState !== 0 ||
      media.currentSrc ||
      !(
        media.getAttribute("src")?.trim() ||
        media.querySelector("source[src]")?.getAttribute("src")?.trim()
      )
    ) {
      continue;
    }
    initialized.add(media);
    media.load();
  }
}
