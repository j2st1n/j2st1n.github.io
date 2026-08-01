export function getOgImageVersion() {
  return (
    process.env.GITHUB_SHA?.slice(0, 12) ??
    process.env.CF_PAGES_COMMIT_SHA?.slice(0, 12) ??
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ??
    "local"
  );
}

export function getGeneratedOgImageFileName() {
  return `share-${getOgImageVersion()}.png`;
}
