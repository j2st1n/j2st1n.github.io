import assert from "node:assert/strict";
import test from "node:test";
import { initArticleMedia } from "../src/utils/initArticleMedia.ts";

function player(overrides = {}) {
  return {
    readyState: 0,
    currentSrc: "",
    error: null,
    loads: 0,
    getAttribute: () => "https://media.example.test/clip.mp4",
    querySelector: () => null,
    load() {
      this.loads += 1;
    },
    ...overrides,
  };
}

test("initializes unselected video and source-based audio once after navigation", () => {
  const video = player({ error: { code: 4 } });
  const audio = player({
    getAttribute: () => null,
    querySelector: () => ({ getAttribute: () => "/sound.mp3" }),
  });
  const root = { querySelectorAll: () => [video, audio] };
  initArticleMedia(root);
  initArticleMedia(root);
  assert.equal(video.loads, 1);
  assert.equal(audio.loads, 1);
  const nextPage = player();
  initArticleMedia({ querySelectorAll: () => [nextPage] });
  assert.equal(nextPage.loads, 1);
});

test("does not reset loading, playable, failed or source-less players", () => {
  const players = [
    player({ currentSrc: "/loading.mp4" }),
    player({ readyState: 4, currentTime: 5 }),
    player({ currentSrc: "/failed.mp4", error: { code: 4 } }),
    player({ getAttribute: () => null }),
    player({ getAttribute: () => "   " }),
  ];
  initArticleMedia({ querySelectorAll: () => players });
  assert.deepEqual(
    players.map(media => media.loads),
    [0, 0, 0, 0, 0]
  );
  assert.equal(players[1].currentTime, 5);
});
