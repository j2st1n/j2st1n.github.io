---
author: J2
title: CF 会不会自动转 WebP？一篇实验记录
slug: cf-webp-experiment
description: 上传一张 Public Domain 的 NASA 图片，只传 JPG，不传 WebP，验证 Cloudflare Worker/R2 侧是否会按 Accept 自动转码。
pubDatetime: 2026-03-15T18:56:00+08:00
tags:
  - 图床
  - 实验
featured: false
draft: true
---

这篇文章只做一件事：验证 `img.bins.blog`（Cloudflare Worker → R2）是否会 **自动把 JPG/PNG 转成 WebP**。

## 实验设置

- 素材：Wikimedia Commons 上的 NASA/ESA 公共领域图片（Public domain）
  - 文件页：<https://commons.wikimedia.org/wiki/File:Hubble_ultra_deep_field.jpg>
  - 原图直链（Wikimedia）：<https://upload.wikimedia.org/wikipedia/commons/2/2f/Hubble_ultra_deep_field.jpg>
- 操作：只把 **JPG 原图** 上传到图床（不上传 WebP 版本）
- 验证：
  - 正常请求 `...jpg`
  - 带 `Accept: image/webp` 的请求 `...jpg`
  - 对比返回 `Content-Type` 与文件头

## 图片（只上传 JPG）

![](https://img.bins.blog/2026/03/cf-webp-experiment/hubble-ultra-deep-field.jpg)

## 结果

结论：**不会自动转 WebP**（至少当前这套 Worker/R2 透传实现不会）。

证据：

- 默认请求返回：`Content-Type: image/jpeg`
- 即使请求头 `Accept: image/webp`，返回仍是：`Content-Type: image/jpeg`
- 响应体文件头是 JPEG（`FF D8 FF ... Exif`），不是 WebP（`RIFF .... WEBP`）

## 为什么之前那张是 WebP？

因为当时上传/引用的文件本身就是 `.webp`（而且 R2 里同路径也同时存在 `.jpg` / `.webp` 两份对象），不是 Cloudflare 动态转出来的。
