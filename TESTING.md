# 如何测试 YeTikz（含 Quiver 支持）

## 一、构建插件

在项目根目录执行：

```bash
cd ye-tikz
npm install   # 若已安装可跳过
npm run build
```

成功后会生成 `main.js`。开发时可用 `npm run dev` 监听文件变化并自动重新构建。

## 二、在 Obsidian 中加载插件

**方式 A：开发模式（推荐）**

1. 把整个插件目录链接或复制到 vault 的插件目录：
   ```bash
   # 在 Obsidian 的 vault 根目录下
   mkdir -p .obsidian/plugins/ye-tikz
   cp main.js manifest.json styles.css .obsidian/plugins/ye-tikz/
   # 若有其它需发布的文件（如 imgs/）也一并复制
   ```
2. 打开 Obsidian → 设置 → 社区插件 → 关闭「安全模式」→ 已安装插件里启用 **YeTikz**。
3. 之后每次 `npm run build` 后，把新的 `main.js` 再复制到上述目录并重载 Obsidian（或重新打开仓库）即可。

**方式 B：从已安装插件替换**

若本机已通过「从文件安装」或「BRAT」安装过 YeTikz，找到该插件所在目录（一般在 vault 的 `.obsidian/plugins/ye-tikz/`），用你构建出的 `main.js`、`manifest.json`、`styles.css` 覆盖原文件，然后重载 Obsidian。

## 三、测试 Quiver 支持

1. 新建或打开一篇笔记，切换到「编辑」模式。
2. 插入一个 **tikz** 代码块，内容使用 `\usepackage{quiver}` 和从 [q.uiver.app](https://q.uiver.app) 导出的 LaTeX，例如：

````markdown
```tikz
\usepackage{quiver}
\begin{document}
\begin{tikzcd}
  A \arrow[r, "f"] \arrow[d, "g"'] & B \arrow[d, "h"] \\
  C \arrow[r, "k"']                & D
\end{tikzcd}
\end{document}
```
````

3. 切换到「阅读」模式（或等待渲染），应看到交换图被渲染成 SVG，而不是报错或空白。
4. **可选**：在 q.uiver.app 画一个带弯曲箭头（curve）或双线箭头（2tail）的图，导出 LaTeX 后粘贴到 tikz 代码块，确认样式正常。
5. 若某张图报错：可查看浏览器开发者工具控制台（F12）中的具体错误；复杂 quiver 样式（curve、between）在 TikZJax 中为 no-op，仅基础交换图会完整渲染。

## 四、快速自检清单

- [ ] `npm run build` 无报错，且 `main.js` 已更新。
- [ ] Obsidian 中已启用 YeTikz，并重载过插件/仓库。
- [ ] 不含 quiver 的普通 tikz 图（如 README 中的示例）能正常渲染。
- [ ] 含 `\usepackage{quiver}` 的交换图能渲染。
- [ ] （可选）从 q.uiver.app 导出的复杂图能渲染；curve/between 等为 no-op，箭头可能略简化为普通 tikz-cd。

## 五、常见问题

- **构建报错 `tsc: command not found`**  
  先执行 `npm install`，再用 `npm run build`；或使用 `npx tsc -noEmit -skipLibCheck && node esbuild.config.mjs production`。

- **Obsidian 里看不到/不渲染 tikz 块**  
  确认代码块语言是 `tikz`（三个反引号 + tikz），且已切换到阅读模式；检查控制台是否有 YeTikz 报错。

- **Quiver 图报错或样式异常**  
  插件已将 quiver 替换为 TikZJax 可用的最小集合（tikz-cd + amssymb，curve/between 等为 no-op）。若仍异常，可查看控制台具体错误。
