# 团队 Agent 插件市场

团队 AI 研发插件的统一安装源，支持 **Claude Code**、**Codex**、**ZCode** 和 **HuiMate**。只需添加一次本市场，即可按需安装和更新团队标准插件。

## 可用插件

| 插件标识 | 功能简介 | 前置依赖 | 源码仓库 |
| :--- | :--- | :--- | :--- |
| `team-standards` | 团队编码规范与 Git 分支、提交、推送门禁 | 无 | [team-agent-skills](https://github.com/LinYang-github/team-agent-skills) (`develop`) |
| `codespec` | 基于 OpenSpec 的研发流：探索 → 提案 → 实现 → 测试 → 归档 | 需全局安装 `codespec` CLI | [CodeSpec](https://github.com/LinYang-github/CodeSpec) (`codespec-plugin`) |

## 快速开始

> **前置要求**：请确保本地 Git 已配置好 SSH Key 或访问凭据，且拥有**本仓库及对应插件源码仓库**的读取权限（安装时工具会自动拉取对应插件仓库）。

默认使用 HTTPS 地址 `https://github.com/WuFuxiu/team-agent-marketplace.git`（若使用 SSH，可替换为 `git@github.com:WuFuxiu/team-agent-marketplace.git`，勿加 `ssh://`）。

### 1. Claude Code

在交互终端中依次执行：

```text
/plugin marketplace add https://github.com/WuFuxiu/team-agent-marketplace.git#main
/plugin install <插件名>@team-agent-marketplace
```

### 2. Codex

在终端执行命令（或在会话中输入 `/plugins` 从图形列表安装）：

```bash
codex plugin marketplace add https://github.com/WuFuxiu/team-agent-marketplace.git --ref main
codex plugin add <插件名>@team-agent-marketplace
```

### 3. ZCode

- **桌面端**：`设置` → `插件` → 右上角 `创建` → `添加插件市场`，填入 `https://github.com/WuFuxiu/team-agent-marketplace.git#main` → 在插件列表中点击安装。
- **命令行**（需安装 `zcode` CLI）：
  ```bash
  zcode plugins marketplace add "https://github.com/WuFuxiu/team-agent-marketplace.git#main"
  zcode plugins install <插件名>@team-agent-marketplace
  ```

### 4. HuiMate

侧边栏进入 `专家 · 技能 · 连接器` → `插件` → `添加源`：
- **类型**：Git 仓库
- **地址**：`https://github.com/WuFuxiu/team-agent-marketplace.git`
- **分支**：`main`

保存后在插件列表中点击安装。

> **提示**：所有工具在安装或更新插件后，建议**新建会话**以使插件生效。

## 更新插件

当插件发布新版本时，按以下方式同步最新内容：

| 工具 | 更新方式 |
| :--- | :--- |
| **Claude Code** | 执行 `/plugin marketplace update team-agent-marketplace`，随后更新对应插件 |
| **Codex** | 新建会话时自动同步；或手动执行 `codex plugin marketplace upgrade team-agent-marketplace` |
| **ZCode** | 先更新市场：`zcode plugins marketplace update team-agent-marketplace`<br>再更新插件：`zcode plugins update <插件名>@team-agent-marketplace` |
| **HuiMate** | 在「插件」页点击「刷新全部」，再对目标插件点击「安装」以覆盖旧版本 |

## 维护者指南：如何上架新插件

<details>
<summary>点击展开插件登记与内网同步规范（仅市场维护者需关注）</summary>

### 1. 插件仓库结构要求
插件源码独立维护在各自仓库中，根目录需包含：
- `.claude-plugin/plugin.json`
- `.codex-plugin/plugin.json`
- `skills/` 目录（结构可参考 `team-agent-skills`）

*注：独立插件仓库内不要放置 `marketplace.json`。*

### 2. 在本仓库登记清单
同时修改以下两个清单文件，保持 `name`、`url`、`ref` 一致（`name` 需与插件内的 `plugin.json` 一致，无需填写 `version`）：
- [.claude-plugin/marketplace.json](.claude-plugin/marketplace.json)（供 Claude Code、ZCode、HuiMate 读取）
- [.agents/plugins/marketplace.json](.agents/plugins/marketplace.json)（供 Codex 读取，需额外包含 `policy` 与 `category` 字段）

配置示例：
```json
{
  "name": "<插件名>",
  "source": {
    "source": "url",
    "url": "https://<Git服务器>/<组>/<插件仓库>.git",
    "ref": "<分支>"
  }
}
```

### 3. 内网镜像维护
内网环境需独立部署本仓库镜像，将两个 `marketplace.json` 中的 `url` 替换为内网 GitLab 仓库地址即可，其余结构保持不变。

</details>
