# 团队 Agent 插件市场

团队所有 Agent 插件的统一入口。用户只添加一次本仓库地址，就能在 Codex、ZCode、HuiMate、Claude Code 里看到并安装下面的插件。以后新增插件，在本仓库登记一行，用户刷新市场就能看到，不用再添加新地址。

本仓库只放市场清单，不放插件内容；每个插件在自己的仓库里维护和发版。

## 插件

| 插件 | 用途 | 插件仓库 | 分支 |
| --- | --- | --- | --- |
| `team-standards` | 团队编码规范与 Git 分支、提交和推送门禁 | [team-agent-skills](https://github.com/LinYang-github/team-agent-skills) | `develop` |
| `codespec` | 基于 OpenSpec 的开发流程：探索 → 立提案 → 实现 → 测试 → 归档 | [CodeSpec](https://github.com/LinYang-github/CodeSpec) | `codespec-plugin` |

安装标识为 `<插件名>@team-agent-marketplace`。各插件自己的前置依赖见插件仓库的 README，例如 `codespec` 还要全局安装 codespec 命令行。

## 前置条件

- Git 能访问**本仓库和每个插件仓库**。安装时工具会按清单里的地址去克隆插件仓库，只有本仓库的权限不够。
- 凭据或 SSH key 提前配好。添加市场时不会弹出登录框。

下文的 `<市场地址>` 是本仓库的 Git 地址，分支为 `main`。HTTPS 地址保留结尾的 `.git`；SSH 地址用 `git@host:group/repo.git` 形式，不要用 `ssh://`。

## 添加市场并安装插件

**Codex**

```bash
codex plugin marketplace add <市场地址> --ref main
codex plugin add <插件名>@team-agent-marketplace
```

也可以在 Codex 里输入 `/plugins`，从"团队 Agent 插件市场"安装。装完新建会话。

**ZCode**

桌面端：设置 → 插件 → 右上角「创建」→「添加插件市场」，填 `<市场地址>#main`，添加后在插件列表中安装，再新建会话。

命令行（需要单独安装的 `zcode` CLI）：

```bash
zcode plugins marketplace add "<市场地址>#main"
zcode plugins install <插件名>@team-agent-marketplace
```

**HuiMate**

侧栏「专家 · 技能 · 连接器」→「插件」→「添加源」：类型选 Git 仓库，地址填 `<市场地址>`，分支填 `main`。保存后在插件列表中安装，再新建会话。

**Claude Code**

```text
/plugin marketplace add <市场地址>#main
/plugin install <插件名>@team-agent-marketplace
```

## 更新

清单条目不写版本号：插件发版时本仓库不用改，执行更新就会重新取插件仓库对应分支的最新内容。代价是 ZCode 不会提示"有可用更新"，要自己定期执行更新。

| 工具 | 怎么更新 |
| --- | --- |
| Codex | 每次新建会话自动同步市场和插件；也可以手动执行 `codex plugin marketplace upgrade team-agent-marketplace` |
| ZCode | `zcode plugins marketplace update team-agent-marketplace`，再 `zcode plugins update <插件名>@team-agent-marketplace`，然后新建会话。`marketplace update` 要带市场名，不带时会刷新全部市场，任一外部市场超时都会让命令失败 |
| HuiMate | 「插件」页点「刷新全部」，再对插件点「安装」并确认新旧版本；只刷新不会替换已安装的版本 |
| Claude Code | 自建市场默认不自动更新：`/plugin marketplace update team-agent-marketplace`，再更新插件 |

## 从旧地址迁移

以前直接把 team-agent-skills 仓库添加为市场的，先卸载 `team-standards@team-agent-skills`、移除 `team-agent-skills` 市场，再按上文添加本市场、安装 `team-standards@team-agent-marketplace`。同一个插件从两个市场各装一份，同一套 skill 会加载两次。

## 登记新插件

1. 插件仓库根目录要有 `.claude-plugin/plugin.json`、`.codex-plugin/plugin.json` 和 `skills/`，格式参照 team-agent-skills。插件仓库自己不放 `marketplace.json`，用户只从本市场安装。
2. 在本仓库的两个清单里各加一条，`name`、`url`、`ref` 两处一致，`name` 与插件 `plugin.json` 的 `name` 一致，不写 `version`：
   - `.claude-plugin/marketplace.json`：Claude Code、ZCode、HuiMate 读取；
   - `.agents/plugins/marketplace.json`：Codex 读取，另带 `policy` 和 `category`。

   ```json
   {
     "name": "<插件名>",
     "source": {
       "source": "url",
       "url": "https://<Git 服务器>/<组>/<插件仓库>.git",
       "ref": "<分支>"
     }
   }
   ```

3. 确认使用者对插件仓库有读取权限。
4. 在四个工具里各装一次，确认能用后再合入。

从清单里删掉一条，不会自动卸载已经装上的插件，要通知用户自己卸载。

## 内网

内网另建一份本仓库，把两个清单里的仓库地址换成内网 GitLab 地址，其余不变。内网和外网的清单不能共用。

## 正式启用前待验证

- 引用其他仓库的写法（`"source": "url"` 加 `ref`）：Codex 已按源码确认、Claude Code 官方支持、ZCode 代码支持，HuiMate 还没验证。推广前在四个工具里各装一次。
- `codespec` 的 `codespec-plugin` 分支推送到远端之前，这一条装不上。
