# Font notice

`kami-cn.woff2` contains a web-optimized subset of TsangerJinKai02, copyright
Beijing Tsanger Type Technology Co., Ltd. It is not covered by this
repository's MIT license.

TsangerJinKai02 is free for personal use only. Commercial use requires a
separate license from the type foundry:

- https://www.tsanger.cn/product/33

The font choice follows the Chinese typography used by the Kami design system:

- https://github.com/tw93/kami#license

## 浏览器分包

页面使用 `kami/` 下的内容指纹 WOFF2 分包，由
`src/styles/kami-fonts.css` 的精确 `unicode-range` 按需加载。基础包提前加载，
其余分包按页面文字选择，所有分包合计保留原 `kami-cn.woff2` 的 7,550 个字符。
原文件保留作为生成源，也兼容仍引用旧 CSS 的读者。OG 构建使用的独立 TTF 不变。

`scripts/fonts/kami-groups.json` 是固定字符分组，按初始化时的公开页面用字频率分组。
发布新文章不重新分组，也不重新生成字体。未在源字体内的字符继续使用原有备用字体。
不要按每次文章词频重新排序，否则会让所有分包的缓存失效。

普通开发、CI 和部署直接使用已提交的字体、CSS 与 manifest，不需要 Python。
只有替换字体或显式调整分组时，才在安装项目依赖后运行：

```sh
python3 -m venv .cache/font-tools
.cache/font-tools/bin/pip install -r scripts/fonts/requirements.txt
.cache/font-tools/bin/python scripts/fonts/generate.py
.cache/font-tools/bin/python scripts/fonts/verify.py
pnpm test
pnpm build
```

校验会检查完整字符覆盖、分包不重叠、内容指纹、每个字形的轮廓与字宽。
生成器只清理 `public/fonts/kami/` 内不再使用的 WOFF2 文件。
