# AgentRel 域名切换到 `agent.openbuild.xyz` 操作清单

更新时间：2026-05-05

## 结论

AgentRel 目前生产站点在 Vercel 项目 `agentrel` 上，默认域名是 `agentrel.vercel.app`。如果要把主域名换成 `https://agent.openbuild.xyz`，不只是加一个 DNS 记录，还需要同步修改：

1. Vercel 项目域名绑定
2. `openbuild.xyz` DNS / Cloudflare 记录
3. Vercel 环境变量 `NEXT_PUBLIC_APP_URL`
4. Supabase Auth 的 Site URL / Redirect URLs
5. 代码里所有硬编码 `https://agentrel.vercel.app`
6. 部署后 OAuth、API markdown URL、bundle URL、grant context URL 的回归测试

当前检查结果：

| 项 | 当前状态 |
| --- | --- |
| 项目路径 | `/home/bre/agentrel` |
| GitHub | `jueduizone/agentrel` |
| Vercel Project | `agentrel` |
| Vercel Project ID | `prj_krOjEt7v9h34kblpsUdNyxDePR8w` |
| Vercel Team/Org ID | `team_hcLWqx3I4gfx9874axASZaQb` |
| 当前生产 URL env | `NEXT_PUBLIC_APP_URL=https://agentrel.vercel.app` |
| Supabase Project URL | `https://zkpeutvzmrfhlzpsbyhr.supabase.co` |
| 已绑定域名 | `agentrel.vercel.app`, `agentrel.xyz`, `www.agentrel.xyz` |
| 目标域名 DNS | `agent.openbuild.xyz` 当前 NXDOMAIN，无 CNAME |
| 推荐 CNAME | `cname.vercel-dns.com.` |

> 注意：记忆里 `openbuild.xyz` 域名和 OpenBuild Vercel 项目可能在另一个 Vercel scope/token 下。当前 AgentRel Vercel 项目在 Ian 的 `ians-projects-142b260c` scope。如果 Vercel 添加 `agent.openbuild.xyz` 时提示域名属于其他 team，需要用 OpenBuild 的 Vercel token/scope 操作，或让 OpenBuild 域名管理员添加 Vercel 要求的 TXT verification。

---

## 一、域名与 DNS

### 1. 添加 Vercel domain

当前 AgentRel 项目：

```bash
cd /home/bre/agentrel
VTOKEN="<paste_vcp_token_here>"
PROJECT_ID=prj_krOjEt7v9h34kblpsUdNyxDePR8w
DOMAIN=agent.openbuild.xyz

curl -sS -X POST "https://api.vercel.com/v10/projects/$PROJECT_ID/domains" \
  -H "Authorization: Bear""er $VTOKEN" \
  -H "Content-Type: application/json" \
  --data "{\"name\":\"$DOMAIN\"}" | python3 -m json.tool
```

如果返回 domain conflict / verification required，继续查询 Vercel 需要的配置：

```bash
curl -sS "https://api.vercel.com/v6/domains/$DOMAIN/config?projectId=$PROJECT_ID" \
  -H "Authorization: Bear""er $VTOKEN" | python3 -m json.tool
```

当前查询到 Vercel 对 `agent.openbuild.xyz` 的推荐配置是：

```txt
CNAME agent.openbuild.xyz -> cname.vercel-dns.com.
```

### 2. 在 Cloudflare / DNS Provider 添加记录

`openbuild.xyz` 当前权威 DNS 是 Cloudflare：

```txt
aitana.ns.cloudflare.com
rex.ns.cloudflare.com
```

添加记录：

| Type | Name | Target | Proxy |
| --- | --- | --- | --- |
| CNAME | `agent` | `cname.vercel-dns.com` | DNS only / 灰云 |

不要开 Cloudflare proxy，Vercel 自己发证书和处理 TLS。

如果 Vercel 要求 TXT ownership verification，还需要添加它返回的 TXT，例如：

| Type | Name | Value |
| --- | --- | --- |
| TXT | `_vercel.openbuild.xyz` 或 Vercel 返回的 name | `vc-domain-verify=agent.openbuild.xyz,...` |

具体值必须以 Vercel API / Dashboard 返回为准。

### 3. 验证 DNS 和 Vercel domain

```bash
# 公共 DNS
curl -sS "https://dns.google/resolve?name=agent.openbuild.xyz&type=CNAME" | python3 -m json.tool
curl -sS "https://cloudflare-dns.com/dns-query?name=agent.openbuild.xyz&type=CNAME" \
  -H 'accept: application/dns-json' | python3 -m json.tool

# 触发 Vercel 验证
curl -sS -X POST "https://api.vercel.com/v9/projects/$PROJECT_ID/domains/$DOMAIN/verify" \
  -H "Authorization: Bear""er $VTOKEN" | python3 -m json.tool

# 检查最终配置
curl -sS "https://api.vercel.com/v6/domains/$DOMAIN/config?projectId=$PROJECT_ID" \
  -H "Authorization: Bear""er $VTOKEN" | python3 -m json.tool
```

通过标准：

- Vercel domain `verified: true`
- config `misconfigured: false`
- `https://agent.openbuild.xyz` 返回 200
- TLS 证书 SAN 包含 `agent.openbuild.xyz`

```bash
env -u HTTPS_PROXY -u HTTP_PROXY -u ALL_PROXY curl -I https://agent.openbuild.xyz

env -u HTTPS_PROXY -u HTTP_PROXY -u ALL_PROXY \
  openssl s_client -connect agent.openbuild.xyz:443 -servername agent.openbuild.xyz </dev/null 2>/dev/null | \
  openssl x509 -noout -subject -issuer -dates -ext subjectAltName
```

---

## 二、Vercel 环境变量

必须更新：

```txt
NEXT_PUBLIC_APP_URL=https://agent.openbuild.xyz
```

当前 Vercel env：

```txt
NEXT_PUBLIC_APP_URL=https://agentrel.vercel.app target=[production, preview]
NEXT_PUBLIC_SUPABASE_URL=*** target=[production]
NEXT_PUBLIC_SUPABASE_ANON_KEY=*** target=[production]
SUPABASE_SERVICE_KEY=*** target=[production]
GITHUB_TOKEN=*** target=[production]
GITHUB_SKILLS_REPO=*** target=[production]
CRON_SECRET=*** target=[production]
MAILGUN_DOMAIN=build.openbuild.xyz target=[production, preview]
MAILGUN_API_KEY=*** target=[production, preview]
```

更新方式：

```bash
PROJECT_ID=prj_krOjEt7v9h34kblpsUdNyxDePR8w
ENV_ID=0wVKb56srKdhU3XT

curl -sS -X PATCH "https://api.vercel.com/v10/projects/$PROJECT_ID/env/$ENV_ID" \
  -H "Authorization: Bear""er $VTOKEN" \
  -H "Content-Type: application/json" \
  --data-raw '{
    "value":"https://agent.openbuild.xyz",
    "type":"plain",
    "target":["production","preview"]
  }' | python3 -m json.tool
```

本地 `.env.local` 也要同步改：

```env
NEXT_PUBLIC_APP_URL=https://agent.openbuild.xyz
```

> 这个变量影响 OAuth redirect URL。忘记改会导致用户从新域名登录后仍跳回旧域名，或者 Supabase redirect URL 不匹配。

---

## 三、Supabase Auth 配置

AgentRel 使用 Supabase Auth。代码中涉及 OAuth / email redirect 的位置：

- `app/auth/login/page.tsx`
- `app/auth/register/page.tsx`
- `app/api/auth/register/route.ts`
- `app/auth/callback/route.ts`

目标域名上线前，Supabase Dashboard 需要更新：

路径：Supabase Project `zkpeutvzmrfhlzpsbyhr` → Authentication → URL Configuration

建议配置：

```txt
Site URL:
https://agent.openbuild.xyz

Redirect URLs:
https://agent.openbuild.xyz/auth/callback
https://agentrel.vercel.app/auth/callback
http://localhost:3000/auth/callback
http://127.0.0.1:3000/auth/callback
```

如果还要支持 preview deployment，可加：

```txt
https://*.vercel.app/auth/callback
```

但 preview wildcard 会扩大允许范围，生产安全上不是必须。

OAuth Provider（如果开启 GitHub/Google）也要检查 provider 自己的 callback 设置。Supabase OAuth 通常 provider 回调是 Supabase 项目域名：

```txt
https://zkpeutvzmrfhlzpsbyhr.supabase.co/auth/v1/callback
```

这个一般不需要改。需要改的是 Supabase 允许跳转回应用的 URL。

---

## 四、代码硬编码修改

当前代码里大量写死了 `https://agentrel.vercel.app`。这些会直接影响用户复制的 curl、Skill markdown、Grant context、Bundle markdown、Feedback endpoint。

必须改成统一 base URL，不建议逐个硬编码新域名。建议新增一个 helper：

```ts
// lib/siteUrl.ts
export const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` ||
  'https://agent.openbuild.xyz'
).replace(/\/$/, '')
```

客户端组件里也可以用：

```ts
const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://agent.openbuild.xyz'
```

需要替换的关键文件：

| 文件 | 影响 |
| --- | --- |
| `app/InstallTabs.tsx` | 首页 curl 示例 |
| `app/HeroSection.tsx` | 首页 index skill URL |
| `app/api-docs/page.tsx` | API docs redirect |
| `app/skills/SkillsClient.tsx` | Skill markdown URL fallback |
| `app/skills/[...id]/page.tsx` | Skill detail copy/download URL |
| `app/bundles/BundlesClient.tsx` | Bundle install command |
| `app/api/bundles/[id]/markdown/route.ts` | Bundle markdown 内链接 |
| `app/api/discover/route.ts` | Discover API 返回 URL |
| `app/api/skills/[...id]/route.ts` | Pro lock 提示里的站点 URL |
| `app/api/v1/skill.md/route.ts` | 主 skill index markdown |
| `app/api/v1/grants/[id]/context/route.ts` | Grant context JSON URL |
| `app/api/v1/grants/[id]/context.md/route.ts` | Grant context markdown URL |
| `app/build/[id]/ApplyCTA.tsx` | build 页面 context URL |
| `app/build/[id]/page.tsx` | build 页面 Agent Context 链接 |
| `lib/grantSkill.ts` | grant skill 生成内容 |
| `skills/grant-apply/SKILL.md` | 静态 skill 文档 |
| `lib/seed.ts` | seed 数据里的 feedback endpoint |
| `output/skills/**/SKILL.md` | 生成出来的 skill 源文件，若会重新导入 DB，也要改 |

快速定位：

```bash
cd /home/bre/agentrel
rg "agentrel\.vercel\.app|NEXT_PUBLIC_APP_URL|auth/callback" app lib skills output --glob '!node_modules'
```

替换后必须确认：

```bash
npm run lint
npm run build
rg "agentrel\.vercel\.app" app lib skills output --glob '!node_modules'
```

允许保留旧域名的地方只有迁移说明、兼容性文档或 redirect fallback；用户可见 URL 不应再出现旧域名。

---

## 五、是否要保留旧域名 / 重定向策略

建议：第一阶段不要强制全站 301 到新域名，先保持 `agentrel.vercel.app` 可用，减少 agent、curl、已发布 skill URL 的断链风险。

更稳的策略：

1. `agent.openbuild.xyz` 作为 canonical / 对外主域名。
2. `agentrel.vercel.app` 保留至少 30-90 天。
3. UI 页面可以逐步 301 到新域名。
4. API endpoint 不建议立刻 301，尤其是：
   - `/api/v1/skill.md`
   - `/api/skills/*.md`
   - `/api/bundles/*/markdown`
   - `/api/v1/grants/*/context.md`

原因：很多 agent/CLI/curl 对 301 的处理不一致，API 先保持兼容更安全。

如果要做 UI-only redirect，可在 `middleware.ts` 里按 Host 判断，跳过 `/api`：

```ts
const host = request.headers.get('host')
if (host === 'agentrel.vercel.app' && !pathname.startsWith('/api')) {
  const url = request.nextUrl.clone()
  url.hostname = 'agent.openbuild.xyz'
  url.protocol = 'https:'
  return NextResponse.redirect(url, 301)
}
```

---

## 六、Vercel Cron / Webhook 影响

`vercel.json` 当前只有一个 cron：

```json
{
  "crons": [
    {
      "path": "/api/cron/update-skills",
      "schedule": "0 18 * * *"
    }
  ]
}
```

这个 cron 是 Vercel 内部按 deployment host 调用 path，不依赖 `NEXT_PUBLIC_APP_URL`，域名切换本身不需要改。

但 `/api/cron/update-skills` 校验：

```ts
Authorization: Bearer ${process.env.CRON_SECRET}
```

所以部署前不要动 `CRON_SECRET`。如果重建到另一个 Vercel project/scope，要复制这个环境变量。

当前未发现外部 webhook callback URL 硬编码为旧域名。`webhook` 命中主要在 eval 数据里，不是运行时配置。

---

## 七、部署流程

### 推荐流程

```bash
cd /home/bre/agentrel

# 1. 确认不要把 eval 脏文件带进提交 / CLI 部署
git status --short

# 2. 修改代码和 .env.local
# 3. 本地验证
npm run lint
npm run build

# 4. 提交前确认 git author，避免 Vercel 拒绝部署
git config user.email jueduizone@gmail.com
git config user.name "Ian Xu"

git add app lib skills output .env.local.example docs/agent-openbuild-domain-cutover.md
git commit -m "chore: prepare AgentRel custom domain cutover"
git push origin main

# 5. 手动生产部署。AgentRel 的 GitHub integration 曾不稳定，不能只依赖 push。
VTOKEN="<paste_vcp_token_here>"
npx vercel --prod --yes --token "$VTOKEN"
```

如果 repo 有无关 dirty 文件，避免 Vercel CLI 上传脏工作区，用 clean archive 部署：

```bash
cd /home/bre/agentrel
npm run build
git push origin main

rm -rf /tmp/agentrel-deploy
mkdir -p /tmp/agentrel-deploy
git archive HEAD | tar -x -C /tmp/agentrel-deploy
mkdir -p /tmp/agentrel-deploy/.vercel
cp .vercel/project.json /tmp/agentrel-deploy/.vercel/project.json

cd /tmp/agentrel-deploy
npx vercel --prod --yes --token "$VTOKEN"
```

---

## 八、上线后验收清单

### 1. 域名和页面

```bash
curl -I https://agent.openbuild.xyz
curl -sS https://agent.openbuild.xyz | head
```

浏览器检查：

- 首页打开正常
- 首页复制的 install command 是 `agent.openbuild.xyz`
- `/skills` 列表正常
- `/skills/<id>` 详情页正常
- `/bundles` 页面 curl 命令是新域名

### 2. API markdown

```bash
curl -sS https://agent.openbuild.xyz/api/v1/skill.md | head -60
curl -sS "https://agent.openbuild.xyz/api/skills?ecosystem=ethereum&limit=5" | python3 -m json.tool | head -60
curl -I https://agent.openbuild.xyz/api/skills/monad/network-config.md
```

检查返回内容里不应再出现 `agentrel.vercel.app`：

```bash
curl -sS https://agent.openbuild.xyz/api/v1/skill.md | grep -n "agentrel.vercel.app" || true
```

### 3. OAuth / Auth

检查登录页：

```txt
https://agent.openbuild.xyz/auth/login
```

验证：

- Email/password 登录成功
- GitHub/Google OAuth（如果启用）能从 Supabase 回到 `https://agent.openbuild.xyz/auth/callback`
- 登录后 cookie `agentrel_session` 在 `agent.openbuild.xyz` 域下存在
- `/admin` 未登录会跳到 `/auth/login?redirect=/admin`
- 登录后 `/admin` 可访问

### 4. Grant / Build URL

```bash
curl -sS https://agent.openbuild.xyz/api/v1/grants/<grant_id>/context.md | head -80
```

检查 markdown 内所有 Skill URL、Apply URL、Feedback URL 都是 `agent.openbuild.xyz`。

### 5. 旧域兼容

```bash
curl -I https://agentrel.vercel.app/api/v1/skill.md
curl -I https://agentrel.vercel.app/skills/grant-apply
```

第一阶段建议 API 旧域仍返回 200，UI 可选 301。

---

## 九、风险点

1. **OpenBuild 域名所有权和当前 Vercel team 不一致**  
   当前 AgentRel 项目在 Ian Vercel team。`agent.openbuild.xyz` 属于 OpenBuild DNS。添加 domain 可能需要 OpenBuild DNS TXT 验证，或必须迁移/重建到 OpenBuild Vercel team。

2. **Supabase Redirect URL 漏改会导致 OAuth 失败**  
   表现为登录后跳回旧域名、`redirect_uri is not allowed`、或 callback 后 session 丢失。

3. **代码硬编码很多**  
   不统一抽 `SITE_URL`，以后还会漏。尤其 markdown API 给 agent 用，一旦旧域写进内容，会外部长期传播。

4. **Vercel GitHub integration 不稳定**  
   AgentRel 之前出现过 push 后生产没更新。域名切换必须手动确认 deployment 和线上内容，不要只看 git push 成功。

5. **当前 repo 有 eval 脏文件**  
   Vercel CLI 会上传当前工作目录。部署前必须 clean archive，或至少确认脏文件不会影响 build。

---

## 十、最小执行清单

如果只要最快上线，按这个顺序：

1. Vercel 添加 `agent.openbuild.xyz` 到 project `prj_krOjEt7v9h34kblpsUdNyxDePR8w`。
2. Cloudflare 添加 `CNAME agent -> cname.vercel-dns.com`，DNS only。
3. 如果 Vercel 要 TXT，添加 `_vercel.openbuild.xyz` 的 verify TXT。
4. Vercel env 更新 `NEXT_PUBLIC_APP_URL=https://agent.openbuild.xyz`。
5. Supabase Auth 添加 `https://agent.openbuild.xyz/auth/callback`，Site URL 改为 `https://agent.openbuild.xyz`。
6. 代码替换 `agentrel.vercel.app` 为统一 `SITE_URL` / 新域名。
7. `npm run lint && npm run build`。
8. commit + push，必要时 clean archive 手动 `vercel --prod`。
9. 验证首页、OAuth、`/api/v1/skill.md`、`/api/skills/*.md`、grant context markdown。
10. 保留旧域 API 兼容一段时间，不急着全站 301。
