import fs from "node:fs/promises";
import path from "node:path";

let cachedFontBuffer: ArrayBuffer | null = null;

/**
 * 加载 Kami 官方核心字体：仓耳今楷 (TsangerJinKai02-W05)
 * 优先从本地 public/fonts/ 或 scripts/ 读取，未命中则自动从 Kami 官方 CDN 下载缓存
 */
async function loadKamiFont(): Promise<
  Array<{ name: string; data: ArrayBuffer; weight: number; style: string }>
> {
  if (cachedFontBuffer) {
    return [
      {
        name: "TsangerJinKai02",
        data: cachedFontBuffer,
        weight: 500,
        style: "normal",
      },
    ];
  }

  const localPaths = [
    path.resolve(process.cwd(), "public/fonts/TsangerJinKai02-W05.ttf"),
    path.resolve(process.cwd(), "scripts/TsangerJinKai02-W05.ttf"),
  ];

  for (const p of localPaths) {
    try {
      const data = await fs.readFile(p);
      cachedFontBuffer = data.buffer;
      return [
        {
          name: "TsangerJinKai02",
          data: cachedFontBuffer,
          weight: 500,
          style: "normal",
        },
      ];
    } catch {
      // 尝试下一个路径
    }
  }

  // 线上/CI 环境回退下载并内存缓存
  const url =
    "https://cdn.jsdelivr.net/gh/tw93/Kami@main/assets/fonts/TsangerJinKai02-W05.ttf";
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download TsangerJinKai02 font: ${res.status}`);
  }
  const buf = await res.arrayBuffer();
  cachedFontBuffer = buf;

  return [
    {
      name: "TsangerJinKai02",
      data: cachedFontBuffer,
      weight: 500,
      style: "normal",
    },
  ];
}

export default loadKamiFont;
