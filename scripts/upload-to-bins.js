#!/usr/bin/env node

/**
 * Obsidian Image Upload → Cloudflare Worker + R2
 *
 * Usage:
 *   UPLOAD_ENDPOINT=https://your.host/__upload UPLOAD_TOKEN=xxx node upload-to-bins.js /path/to/image.png [slug]
 */

const fs = require("fs");
const path = require("path");

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: node upload-to-bins.js <file> [slug]");
  process.exit(1);
}

const ENDPOINT = process.env.UPLOAD_ENDPOINT;
if (!ENDPOINT) {
  console.error("Error: UPLOAD_ENDPOINT env var not set");
  process.exit(1);
}

const TOKEN = process.env.UPLOAD_TOKEN;
if (!TOKEN) {
  console.error("Error: UPLOAD_TOKEN env var not set");
  process.exit(1);
}

const slug = process.argv[3] || "blog";

async function upload() {
  const file = fs.readFileSync(filePath);
  const base = path.basename(filePath);

  const form = new FormData();
  form.append("file", new Blob([file]), base);
  form.append("slug", slug);

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: form,
  });

  const data = await res.json();
  if (!data.ok) {
    console.error(`Upload failed: ${data.error}`);
    process.exit(1);
  }

  // Output URL to stdout — the Obsidian plugin reads this
  console.log(data.url);
}

upload().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
