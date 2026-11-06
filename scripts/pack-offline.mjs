#!/usr/bin/env node

/**
 * 跨平台离线插件市场打包脚本 (支持 Windows / macOS / Linux)
 *
 * 功能：
 * 1. 读取 .claude-plugin/marketplace.json 与 .agents/plugins/marketplace.json
 * 2. 自动拉取所有登记插件的指定分支源码到离线包 plugins/<插件名> 目录
 * 3. 将两个清单中的远程 Git URL 转换为跨平台本地相对路径 (./plugins/<插件名>)
 * 4. 生成离线安装说明 README.md，并初始化本地 Git 仓库 (main 分支) 以兼容各类客户端
 * 5. 自动打包为 .zip 或 .tar.gz 离线分发压缩包
 *
 * 用法：
 *   node scripts/pack-offline.mjs [选项]
 *
 * 选项：
 *   -o, --output <dir>      输出目录 (默认: ./dist)
 *   -n, --name <name>       离线包目录及压缩包名称 (默认: team-agent-marketplace-offline)
 *   -f, --format <fmt>      压缩格式: zip | tar.gz | none (默认: zip)
 *   --no-git                不在离线包内初始化本地 .git 仓库
 *   -h, --help              查看帮助信息
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

function printHelp() {
  console.log(`
用法: node scripts/pack-offline.mjs [选项]

选项:
  -o, --output <dir>      指定输出目录 (默认: ./dist)
  -n, --name <name>       指定离线包名称 (默认: team-agent-marketplace-offline)
  -f, --format <fmt>      打包格式: zip | tar.gz | none (默认: zip)
  --no-git                不在离线包目录中初始化 .git 仓库
  -h, --help              显示此帮助信息

示例:
  node scripts/pack-offline.mjs
  node scripts/pack-offline.mjs --format tar.gz
  node scripts/pack-offline.mjs --output ./release --format none
`.trim());
}

function parseArgs(argv) {
  const options = {
    outputDir: path.join(REPO_ROOT, "dist"),
    bundleName: "team-agent-marketplace-offline",
    format: "zip",
    initGit: true,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") {
      printHelp();
      process.exit(0);
    } else if (arg === "-o" || arg === "--output") {
      if (!argv[i + 1]) throw new Error(`参数 ${arg} 需要指定目录路径`);
      options.outputDir = path.resolve(process.cwd(), argv[++i]);
    } else if (arg === "-n" || arg === "--name") {
      if (!argv[i + 1]) throw new Error(`参数 ${arg} 需要指定名称`);
      options.bundleName = argv[++i];
    } else if (arg === "-f" || arg === "--format") {
      const fmt = argv[++i];
      if (!["zip", "tar.gz", "tgz", "none"].includes(fmt)) {
        throw new Error(`不支持的打包格式: ${fmt}（可选: zip | tar.gz | none）`);
      }
      options.format = fmt === "tgz" ? "tar.gz" : fmt;
    } else if (arg === "--no-git") {
      options.initGit = false;
    } else {
      throw new Error(`未知参数: ${arg}，使用 --help 查看帮助`);
    }
  }

  return options;
}

function runCmd(cmd, args, options = {}) {
  return execFileSync(cmd, args, {
    stdio: options.silent ? "pipe" : "inherit",
    encoding: "utf8",
    ...options,
  });
}

function ensureGitAvailable() {
  try {
    runCmd("git", ["--version"], { silent: true });
  } catch {
    throw new Error("未检测到 git 命令，请先安装 Git 并确保其在系统 PATH 中。");
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function collectPluginSources(claudeManifest, codexManifest) {
  const pluginMap = new Map();

  for (const manifest of [claudeManifest, codexManifest]) {
    if (!manifest || !Array.isArray(manifest.plugins)) continue;
    for (const plugin of manifest.plugins) {
      if (!plugin.name || pluginMap.has(plugin.name)) continue;
      const src = plugin.source;
      if (typeof src === "string") {
        pluginMap.set(plugin.name, {
          name: plugin.name,
          type: "local",
          path: src,
        });
      } else if (src && typeof src === "object") {
        if (src.source === "url" && src.url) {
          pluginMap.set(plugin.name, {
            name: plugin.name,
            type: "url",
            url: src.url,
            ref: src.ref || "main",
          });
        } else if (src.source === "local" && src.path) {
          pluginMap.set(plugin.name, {
            name: plugin.name,
            type: "local",
            path: src.path,
          });
        }
      }
    }
  }

  return Array.from(pluginMap.values());
}

function generateOfflineReadme(bundleName, pluginsMeta) {
  const pluginRows = pluginsMeta
    .map(
      (p) =>
        `| \`${p.name}\` | \`./plugins/${p.name}\` | \`${p.ref || "-"}\` | \`${p.commit || "-"}\` |`
    )
    .join("\n");

  return `# 团队 Agent 插件市场（离线版）

本目录是由 \`scripts/pack-offline.mjs\` 自动构建的**完全无网/单机离线插件市场包**，已内置所有插件源码，无需访问外部 Git 服务即可在本地安装。

## 内置插件清单

| 插件标识 | 本地路径 | 源码分支 | 打包 Commit |
| :--- | :--- | :--- | :--- |
${pluginRows}

> **前置依赖提示**：\`codespec\` 插件仅提供 Skills，离线环境还需全局安装同版本的 \`codespec\` CLI 工具。

---

## 离线安装指南

请先将压缩包解压到本地固定目录（不要放在临时清理目录中，因为工具会引用该目录作为本地市场源）：
- **macOS / Linux 示例路径**：\`/opt/${bundleName}\`
- **Windows 示例路径**：\`C:\\opt\\${bundleName}\`

### 1. Claude Code

在交互终端中依次执行：

\`\`\`text
# macOS / Linux
/plugin marketplace add /opt/${bundleName}
/plugin install <插件名>@team-agent-marketplace

# Windows
/plugin marketplace add C:\\opt\\${bundleName}
/plugin install <插件名>@team-agent-marketplace
\`\`\`

### 2. Codex

在终端执行命令：

\`\`\`bash
# macOS / Linux
codex plugin marketplace add /opt/${bundleName}
codex plugin add <插件名>@team-agent-marketplace

# Windows (PowerShell / CMD)
codex plugin marketplace add C:\\opt\\${bundleName}
codex plugin add <插件名>@team-agent-marketplace
\`\`\`

### 3. ZCode

- **桌面端**：\`设置\` → \`插件\` → 右上角 \`创建\` → \`添加插件市场\`，填入本地解压目录路径（如 \`/opt/${bundleName}\` 或 \`C:\\opt\\${bundleName}\`）→ 在插件列表中点击安装。
- **命令行**：
  \`\`\`bash
  zcode plugins marketplace add "/opt/${bundleName}"
  zcode plugins install <插件名>@team-agent-marketplace
  \`\`\`

### 4. HuiMate

侧边栏进入 \`专家 · 技能 · 连接器\` → \`插件\` → \`添加源\`：
- **类型**：Git 仓库（本离线包已预初始化本地 Git 仓库与 \`main\` 分支）
- **地址**：填本地路径或 \`file://\` 协议地址（例如 \`file:///opt/${bundleName}\` 或 \`file:///C:/opt/${bundleName}\`）
- **分支**：\`main\`

> **提示**：所有工具在安装或更新插件后，建议**新建会话**以使插件生效。
`;
}

function createArchive(outputDir, bundleName, format) {
  const bundleDir = path.join(outputDir, bundleName);
  if (format === "none") return null;

  const ext = format === "tar.gz" ? ".tar.gz" : ".zip";
  const archiveName = `${bundleName}${ext}`;
  const archivePath = path.join(outputDir, archiveName);

  if (fs.existsSync(archivePath)) {
    fs.rmSync(archivePath, { force: true });
  }

  console.log(`\n[4/4] 正在生成跨平台压缩包: ${archivePath} ...`);

  if (format === "tar.gz") {
    runCmd("tar", ["-czf", archivePath, "-C", outputDir, bundleName]);
    return archivePath;
  }

  // format === "zip"
  const isWindows = process.platform === "win32";

  if (!isWindows) {
    try {
      runCmd("zip", ["-rq", archivePath, bundleName], { cwd: outputDir, silent: true });
      return archivePath;
    } catch {
      // fallback to tar -a or python3
    }
  }

  // Windows 10/11+ 和 macOS 的 bsdtar 原生支持 tar -a -cf xxx.zip
  try {
    runCmd("tar", ["-a", "-cf", archivePath, "-C", outputDir, bundleName], { silent: true });
    if (fs.existsSync(archivePath)) return archivePath;
  } catch {
    // fallback
  }

  // Python 3 标准库 zipfile 兜底 (跨平台且完整保留隐藏目录如 .claude-plugin / .agents / .git)
  for (const pyCmd of ["python3", "python"]) {
    try {
      runCmd(pyCmd, ["-m", "zipfile", "-c", archivePath, bundleName], {
        cwd: outputDir,
        silent: true,
      });
      if (fs.existsSync(archivePath)) return archivePath;
    } catch {
      // continue
    }
  }

  if (isWindows) {
    runCmd("powershell", [
      "-NoProfile",
      "-Command",
      `Compress-Archive -Path '${bundleDir}' -DestinationPath '${archivePath}' -Force`,
    ]);
    return archivePath;
  }

  throw new Error(
    "无法创建 .zip 压缩包（未找到 zip / tar / python3），请尝试使用 --format tar.gz 或 --format none"
  );
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  ensureGitAvailable();

  const claudeManifestPath = path.join(REPO_ROOT, ".claude-plugin", "marketplace.json");
  const codexManifestPath = path.join(REPO_ROOT, ".agents", "plugins", "marketplace.json");

  if (!fs.existsSync(claudeManifestPath) || !fs.existsSync(codexManifestPath)) {
    throw new Error("未找到市场清单文件 (.claude-plugin/marketplace.json 或 .agents/plugins/marketplace.json)");
  }

  const claudeManifest = readJson(claudeManifestPath);
  const codexManifest = readJson(codexManifestPath);
  const plugins = collectPluginSources(claudeManifest, codexManifest);

  if (plugins.length === 0) {
    throw new Error("市场清单中未找到任何插件配置");
  }

  const bundleDir = path.join(options.outputDir, options.bundleName);
  if (fs.existsSync(bundleDir)) {
    fs.rmSync(bundleDir, { recursive: true, force: true });
  }
  fs.mkdirSync( path.join(bundleDir, "plugins"), { recursive: true });

  console.log(`[1/4] 准备离线市场目录: ${bundleDir}`);

  const pluginsMeta = [];
  console.log(`[2/4] 拉取插件仓库源码 (共 ${plugins.length} 个插件)...`);

  for (const plugin of plugins) {
    const targetPluginDir = path.join(bundleDir, "plugins", plugin.name);
    if (plugin.type === "url") {
      console.log(`  -> 正在克隆 ${plugin.name} (${plugin.url} @ ${plugin.ref}) ...`);
      runCmd("git", [
        "clone",
        "-c",
        "core.autocrlf=false",
        "--depth",
        "1",
        "--single-branch",
        "--branch",
        plugin.ref,
        plugin.url,
        targetPluginDir,
      ]);

      let commit = "";
      try {
        commit = runCmd("git", ["-C", targetPluginDir, "rev-parse", "--short", "HEAD"], {
          silent: true,
        }).trim();
      } catch {
        commit = "unknown";
      }

      // 移除插件子目录内的 .git，使其作为静态文件内嵌在离线包中
      fs.rmSync(path.join(targetPluginDir, ".git"), { recursive: true, force: true });

      pluginsMeta.push({
        name: plugin.name,
        ref: plugin.ref,
        commit,
        url: plugin.url,
      });
    } else if (plugin.type === "local") {
      const srcDir = path.resolve(REPO_ROOT, plugin.path);
      console.log(`  -> 正在复制本地插件 ${plugin.name} (${srcDir}) ...`);
      fs.cpSync(srcDir, targetPluginDir, { recursive: true });
      fs.rmSync(path.join(targetPluginDir, ".git"), { recursive: true, force: true });
      pluginsMeta.push({
        name: plugin.name,
        ref: "local",
        commit: "-",
      });
    }
  }

  console.log(`\n[3/4] 生成离线版市场清单与说明文档...`);

  // 统一使用 POSIX 相对路径 (./plugins/<name>)，确保在 Windows / macOS / Linux 下均兼容
  const offlineClaudeManifest = {
    ...claudeManifest,
    plugins: (claudeManifest.plugins || []).map((p) => ({
      ...p,
      source: `./plugins/${p.name}`,
    })),
  };

  const offlineCodexManifest = {
    ...codexManifest,
    plugins: (codexManifest.plugins || []).map((p) => ({
      ...p,
      source: {
        source: "local",
        path: `./plugins/${p.name}`,
      },
    })),
  };

  writeJson(path.join(bundleDir, ".claude-plugin", "marketplace.json"), offlineClaudeManifest);
  writeJson(path.join(bundleDir, ".agents", "plugins", "marketplace.json"), offlineCodexManifest);
  writeJson(path.join(bundleDir, "build-info.json"), {
    builtAt: new Date().toISOString(),
    plugins: pluginsMeta,
  });

  fs.writeFileSync(
    path.join(bundleDir, "README.md"),
    generateOfflineReadme(options.bundleName, pluginsMeta),
    "utf8"
  );

  if (options.initGit) {
    console.log(`  -> 初始化离线包本地 Git 仓库 (main 分支)...`);
    runCmd("git", ["init"], { cwd: bundleDir, silent: true });
    runCmd("git", ["checkout", "-B", "main"], { cwd: bundleDir, silent: true });
    runCmd("git", ["config", "user.name", "Team Agent Marketplace"], {
      cwd: bundleDir,
      silent: true,
    });
    runCmd("git", ["config", "user.email", "marketplace@team.local"], {
      cwd: bundleDir,
      silent: true,
    });
    runCmd("git", ["add", "-A"], { cwd: bundleDir, silent: true });
    runCmd("git", ["commit", "-m", "chore: build offline marketplace bundle"], {
      cwd: bundleDir,
      silent: true,
    });
  }

  const archivePath = createArchive(options.outputDir, options.bundleName, options.format);

  console.log(`\n✅ 离线插件市场包构建完成！`);
  console.log(`  - 离线包目录: ${bundleDir}`);
  if (archivePath) {
    console.log(`  - 离线压缩包: ${archivePath}`);
  }
}

try {
  main();
} catch (err) {
  console.error(`\n❌ 打包失败: ${err.message}`);
  process.exit(1);
}
