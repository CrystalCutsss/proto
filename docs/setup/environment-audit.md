# Аудит облачной сессии Claude Code (Фаза 0)

- **Дата:** 2026-10-13.
- **Сессия:** облачная сессия claude.ai/code, окружение по умолчанию (сеть Trusted).
- **Режим:** только чтение. Ничего не устанавливалось и не менялось, кроме проверочного прогона setup-скрипта (см. раздел «Проверка»).
- **Первоисточники:**
  - https://code.claude.com/docs/en/cloud-environments
  - https://code.claude.com/docs/en/claude-code-on-the-web
  - https://code.claude.com/docs/en/permissions
  - индекс https://code.claude.com/docs/llms.txt

## 1. Итог в пяти пунктах

1. **Набор инструментов полный:**
   - Node 22, pnpm 10.28 и Playwright 1.56 с **предустановленным Chromium**;
   - Claude Code 2.1.296.

   Скачивать браузеры не нужно.
2. **`main` не защищена, и защитить её средствами GitHub нельзя.** Для приватного репозитория на бесплатном плане branch protection и rulesets недоступны: HTTP 403 «Upgrade to GitHub Pro». GitHub-прокси сессии тоже не ограничивает, в какие ветки идёт push. Решение — хуки, deny-права, CI и `main-guard`: [ADR-0002](../adr/0002-main-protection-without-rulesets.md).
3. **`gh` работает только через REST.** GraphQL закрыт прокси, поэтому `gh pr …` и `gh issue …` не работают. PR создаются через GitHub-инструменты сессии (MCP) или `gh api repos/CrystalCutsss/proto/pulls`.
4. **Сеть Trusted закрывает:**
   - документацию большинства нужных инструментов (Cloudflare, rclone, GitHub Docs, Playwright, GSAP, Figma…);
   - домены превью хостинга.

   WebFetch ходит через ту же сеть VM. Для Фазы 1 нужен режим Custom (раздел 6).
5. **Google Drive из сессии недоступен:** ни по сети, ни по API без учётных данных. Это совпадает с архитектурой: Drive — только через GitHub Actions. Проверка уровня доступа «Редактор» к папке Proto — через коннектор Google Drive, только чтение ([ADR-0003](../adr/0003-drive-connector-readonly-diagnostics.md)), раздел 5.

## 2. Инструменты VM

Проверено командой `check-tools` и командами версий.

| Что | Факт | Следствие для проекта |
|---|---|---|
| ОС | Ubuntu 24.04.5 LTS, x86_64 | Бинарники только linux-x64 |
| Ресурсы | 4 vCPU, 15 GiB RAM, лимит диска 30 GB (`df` показывает диск хоста, ориентироваться на него нельзя) | Одновременно не больше 2–3 тяжёлых сборок (параллельные билдеры в worktree) |
| Claude Code | 2.1.296 | Доступны subagents (memory, isolation: worktree), skills с `paths`, hooks, `claude plugin eval` |
| Node.js | v22.22.0 по умолчанию; есть `/opt/node20`, `/opt/node21` | Целевая версия — Node 22 |
| npm / yarn / pnpm | 10.9.4 / 1.22.22 / **10.28.0**; corepack 0.34 (`COREPACK_ENABLE_AUTO_PIN=0`) | В `package.json`: `"packageManager": "pnpm@10.28.0"` |
| Глобальные пакеты | TypeScript 6.0.2, ESLint 10.1.0, Prettier 3.8.1, Playwright 1.56.1, http-server, serve | Проект фиксирует свои версии в devDependencies |
| Браузер | **Chromium 141.0.7390.37** (`chromium-1194` + `chromium_headless_shell-1194`) в `/opt/pw-browsers`. Переменные `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers` и `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` заданы | `@playwright/test` закрепляем на 1.56.x (ревизия браузера совпадает). Запасной путь — `executablePath: /opt/pw-browsers/chromium` |
| git | 2.43.0; **git-lfs 3.4.1 со smudge, отключённым** (LFS-файлы приходят указателями) | Учесть в ADR про хранение ассетов ДС (Фаза 2b): LFS-файлы в сессии не читаются без `git lfs pull` |
| gh | 2.89.0 | Только REST, см. раздел 3 |
| Прочее | jq 1.7, yq, docker 29.8 (демон не запущен), gcloud SDK 570 (без учётных данных, не используем), Python 3.13 + uv, Go 1.24, Rust 1.97, Java 21 | — |
| rclone | Нет в `PATH`. `/opt/rclone/rclone-filestore` — служебный бинарник среды, не наш | Так и оставляем: rclone работает только в GitHub Actions |

## 3. GitHub через прокси сессии

| Проверка | Результат |
|---|---|
| Ветка по умолчанию | `main` (1 коммит `Initial commit`) |
| Видимость, владелец | private, владелец — пользователь (User); у сессии admin-права на репозиторий |
| Защита `main` | `protected: false`. `GET …/branches/main/protection` и `GET …/rulesets` возвращают **403 «Upgrade to GitHub Pro or make this repository public»** |
| Ограничение push | По документации прокси отклоняет удаление веток и push не-веток (тегов), но **не ограничивает, какие ветки обновляются** |
| `gh auth status` | Токен — заглушка `proxy-injected`, реальную учётную запись подставляет прокси. Реальных секретов в VM нет |
| GraphQL | **403** «GitHub GraphQL is not available from Claude Code sessions». Не работают `gh pr list/create`, `gh issue …`, `gh repo view` |
| REST: доступно (200) | `actions/runs`, `actions/workflows`, `actions/artifacts`, `pulls`, `issues`, `labels`, `branches`, `contents`, `commits/{sha}/check-runs`, `commits/{sha}/status` |
| REST: закрыто прокси (403) | `actions/secrets`, `actions/variables`, `actions/caches`, `actions/permissions`, `actions/oidc/…`, `environments`, `hooks`, `pages`; `deployments` → 403 «Resource not accessible by integration» |
| Чужие репозитории | API → 403 (сессия привязана к своему репозиторию). **`git ls-remote` и `git clone` публичных репозиториев работают**: проверены anthropics/skills, greensock/gsap-skills, obra/superpowers, anthropics/claude-plugins-official. Загрузки GitHub Releases работают (`github.com/…/releases/download` → `release-assets.githubusercontent.com`). `codeload.github.com` (tarball) → 403 |

**Следствия:**
- **PR:** создаём через GitHub-инструменты сессии (`create_pull_request`) или `gh api -X POST repos/CrystalCutsss/proto/pulls`. В правах и skills Фазы 4 — именно эти команды, не `gh pr create`.
- **Запуск workflows:** `gh workflow run <file> --ref main`. `--ref` обязателен, иначе `gh` идёт за веткой по умолчанию в GraphQL. Пропускает ли прокси `POST …/dispatches`, проверим в Фазе 2b. Запасные варианты: инструмент `actions_run_trigger` или кнопка «Run workflow» в веб-интерфейсе.
- **Чтение результатов:** `gh run list/view` работают через REST. Логи job проверим в 2b.
- **Секреты и Variables:** Claude их не видит. Каждый workflow сам проверяет их наличие и падает с понятным сообщением.
- **Сторонние skills:** ревью и вендоринг через `git clone --depth 1` с фиксацией SHA. Метрика «звёзды» доступна только приблизительно (через поиск). Зрелость меряем по git: дата последнего коммита и активность за 90 дней.
- **Ограничения GitHub Free:**
  - 2000 минут Actions в месяц для приватных репозиториев, поэтому CI держим лёгким;
  - PR, созданные `GITHUB_TOKEN`, не запускают другие workflows, поэтому sync-workflows сами валидируют результат;
  - для автоматических PR нужна настройка «Allow GitHub Actions to create and approve pull requests» (инструкция в Фазе 2a).

## 4. Сеть (уровень Trusted)

Проверено запросами `curl` из VM. Список Trusted — раздел «Default allowed domains» в документации cloud-environments.

**Доступно:**
- `registry.npmjs.org` (идёт мимо прокси), `registry.yarnpkg.com`, `nodejs.org`;
- `github.com` (git), загрузки Releases, `raw.githubusercontent.com`;
- `*.googleapis.com`: discovery API Drive отвечает 200, API Drive достижим, но требует учётных данных; `accounts.google.com`, `storage.googleapis.com`;
- `fonts.googleapis.com`, `fonts.gstatic.com`;
- `archive.ubuntu.com`, `pypi.org`;
- `code.claude.com`, `platform.claude.com`, `cloud.google.com`, `developer.apple.com`, `json-schema.org`.

**Закрыто (CONNECT 403):**

| Группа | Домены |
|---|---|
| Google Drive (веб) | `drive.google.com`, `docs.google.com`, `drive.usercontent.google.com` |
| Загрузка браузеров Playwright | `cdn.playwright.dev`, `playwright.download.prss.microsoft.com`, `playwright.azureedge.net` |
| Хостинг и превью | `api.cloudflare.com`, `dash.cloudflare.com`, `pages.dev`, `workers.dev`, `vercel.com`, `api.netlify.com`, `netlify.app` |
| Figma | `mcp.figma.com`, `api.figma.com`, `www.figma.com` |
| CDN | `unpkg.com`, `cdn.jsdelivr.net`, `www.gstatic.com` |
| Документация | `developers.cloudflare.com`, `rclone.org`, `developers.google.com`, `support.google.com`, `docs.github.com`, `playwright.dev`, `gsap.com`, `threejs.org`, `docs.pmnd.rs`, `styledictionary.com`, `docs.tokens.studio`, `terrazzo.app`, `designtokens.org`, `developers.figma.com`, `help.figma.com`, `vite.dev`, `turborepo.com`, `pnpm.io`, `vitest.dev`, `eslint.org`, `stylelint.io`, `docs.renovatebot.com`, `web.dev`, `developer.chrome.com`, `developer.mozilla.org`, `docs.netlify.com`, `api.npmjs.org` и др. |

**Важные наблюдения:**
- **WebFetch в сессии ходит через сеть VM:** `developers.cloudflare.com` и `drive.google.com` → `ENOTFOUND`. Поэтому документация вне allowlist недоступна и через WebFetch. WebSearch работает на стороне сервера, но даёт только пересказ.
- **Коннекторы claude.ai** (Figma, BuildinAI, Shaders, GitHub) работают через серверы Anthropic и allowlist не требуют. Коннектор Figma уже подключён к сессиям, но **не используется до Фазы 8**. MCP-сервер плагина `figma` (`mcp.figma.com`) не подключился: домена нет в allowlist. Это ожидаемо, домен не добавляем.
- **Skills, включённые на claude.ai,** автоматически попадают в облачные сессии и занимают контекст (раздел 7, шаг 7).

## 5. Доступ к Google Drive

**Проверено из сессии** (только чтение):

| Запрос | Ответ | Вывод |
|---|---|---|
| `GET drive.google.com/embeddedfolderview?id=<Proto>` | CONNECT 403 | Домен не в allowlist |
| `GET www.googleapis.com/drive/v3/files/<Proto>` без учётных данных | 403 «Method doesn't allow unregistered callers» | Drive API требует идентичности даже для папок, открытых по ссылке |
| WebFetch папки | `ENOTFOUND drive.google.com` | WebFetch идёт через ту же сеть |

Секретов в сессии нет по правилам, поэтому прямой доступ невозможен. Так и задумано: конвейер данных Drive → репозиторий работает только в GitHub Actions (Фаза 2).

**Уровень доступа «Редактор».** Вы сообщили, что доступ к папке — «Редактор». Проверяем через **коннектор Google Drive** в claude.ai, только чтение ([ADR-0003](../adr/0003-drive-connector-readonly-diagnostics.md)):
- метаданные и права Proto и DS;
- что DS лежит внутри Proto и её ID = `1c3nATguttXvKvECGx8fexFUnMetjoEnj`;
- общий доступ («Ограниченный» или «Все, у кого есть ссылка», и с какой ролью);
- ваша роль и владелец;
- «Мой диск» или общий диск;
- не ярлык ли DS.

| Поле | Значение |
|---|---|
| Статус | **ожидает подключения коннектора** (раздел 7, шаг 6) |
| Результат | будет записан сюда, email участников маскируются |

**До проверки исходим из худшего случая — «Все, у кого есть ссылка — Редактор».** Это значит, что любой, у кого есть ссылка, может менять и удалять файлы ДС, а ID папки будет в репозитории. Рекомендация:
- общий доступ к Proto и DS — «Ограниченный»;
- людям — индивидуальные роли;
- сервисному аккаунту (Фаза 2a) — только «Читатель».

Запись в DS из нашего конвейера невозможна в любом случае:
- токен Actions запрашивается только со scope `drive.readonly`;
- workflows только читают;
- у коннектора отключены инструменты записи;
- в Фазе 4 хук запретит их вызов.

## 6. Сеть: нужен ли режим Custom

**Да, для Фазы 1.** Анализ экосистемы опирается на первоисточники.

1. Включите режим **Custom** (в обновлённом интерфейсе — **Limited**).
2. **Оставьте галочку «Also include default list of common package managers»** («Allow package managers»).
3. Добавьте домены — только чтение документации:

```text
developers.cloudflare.com
vercel.com
docs.netlify.com
www.netlify.com
rclone.org
developers.google.com
support.google.com
docs.github.com
playwright.dev
gsap.com
threejs.org
docs.pmnd.rs
r3f.docs.pmnd.rs
styledictionary.com
docs.tokens.studio
terrazzo.app
www.designtokens.org
developers.figma.com
help.figma.com
www.figma.com
vite.dev
turborepo.com
pnpm.io
vitest.dev
eslint.org
stylelint.io
docs.renovatebot.com
developer.chrome.com
web.dev
developer.mozilla.org
api.npmjs.org
```

**Позже:**
- **Фаза 5:** домен превью хостинга (для Cloudflare `*.workers.dev` или `*.pages.dev`, уточним после выбора), чтобы Playwright из VM проверял превью под паролем;
- **Фаза 8:** свой домен — `TODO(connect-domain)`.

**Не добавляем:**
- `drive.google.com` — Drive только через Actions и коннектор;
- домены Figma — коннектор работает через Anthropic, подключение в Фазе 8;
- CDN Playwright — браузер предустановлен.

**Если остаться на Trusted,** Фаза 1 пройдёт на WebSearch и документации, лежащей в GitHub-репозиториях. Уверенность выводов будет ниже, это будет отмечено в отчёте.

Изменение allowlist применяется к уже идущим сессиям примерно за минуту. Кэш окружения при этом пересобирается (setup-скрипт запустится заново, он быстрый).

## 7. Что сделать в браузере

Окружения на планах Pro/Max личные: shared-окружения есть только в Team/Enterprise. Секреты в окружение **не кладём**: они живут только в GitHub Secrets и в панели хостинга. Network secrets не используем.

1. **Открыть настройки окружения:**
   1. Откройте https://claude.ai/code.
   2. Над полем ввода сообщения, в строке над ним, нажмите **иконку облака** с именем текущего окружения (например, «Default»).
   3. В меню выберите **Cloud**.
   4. Наведите курсор на текущее окружение и нажмите **шестерёнку** справа. Другой вариант — **Add cloud environment**, имя `proto`.

   Внутри сессии то же меню открывается из заголовка сессии: меню облачного окружения → **Edit**.
2. **Network access** → **Custom** (или **Limited**):
   1. Поставьте галочку включения стандартного списка.
   2. В **Allowed domains** вставьте список из раздела 6, по одному домену в строке.
3. **Environment variables:** оставьте **пустыми**. Значения видны всем, кто пользуется окружением; токенов и паролей там быть не должно.
4. **Setup script:**
   1. Вставьте содержимое файла [`tools/cloud/setup-script.sh`](../../tools/cloud/setup-script.sh) целиком.
   2. Нажмите **Save** (или **Create environment**).

   Скрипт выполняется ~2 с (замер в разделе 8) и укладывается в лимит кэша ~5 минут.
5. **Проверка окружения.** Начните новую сессию в этом окружении и напишите: «запусти check-tools и gitleaks version». Ожидается версия gitleaks `8.30.1` и pnpm `10.28.0`. Если сессия не стартует, проверьте поле Setup script: скрипт обязан завершаться с кодом 0.
6. **Коннектор Google Drive** (для проверки из раздела 5):
   1. Откройте https://claude.ai/customize/connectors → **Google Drive** → **Connect**.
   2. Войдите Google-аккаунтом, у которого есть доступ к папке Proto.
   3. В правах инструментов коннектора **запретите запись**: создание, копирование, загрузку и изменение файлов (`create_file`, `copy_file`, upload/update). Разрешёнными оставьте только чтение: `get_file_metadata`, `get_file_permissions`, `search_files`, `read_file_content`, `download_file_content`, `list_recent_files`.
   4. Напишите в сессии «коннектор подключён». Коннекторы подхватываются при старте сессии, поэтому, возможно, понадобится новая сессия: она продолжит по `docs/STATUS.md`.
7. **По желанию (экономия контекста):**
   - на https://claude.ai/customize/connectors отключите для сессий этого репозитория ненужные коннекторы (BuildinAI, Shaders);
   - в настройках Skills на claude.ai отключите skills, не относящиеся к проекту (status-review, okr-alignment, strategic-analysis и т. п.). Описание каждого включённого skill постоянно занимает контекст.

   Figma оставьте как есть: подключим в Фазе 8.
8. **Смержите PR Фазы 0** на GitHub: вкладка **Pull requests** → PR → **Merge pull request** → **Confirm merge**.

## 8. Setup-скрипт

**Канон** — [`tools/cloud/setup-script.sh`](../../tools/cloud/setup-script.sh). **Что делает:**
- закрепляет pnpm 10.28.0;
- ставит gitleaks 8.30.1 из GitHub Releases с проверкой SHA-256 (нужен для pre-commit-хука в Фазе 4);
- прогревает pnpm store по `pnpm-lock.yaml`, когда он появится (Фаза 3);
- проверяет наличие предустановленного Chromium.

**Чего в скрипте нет и почему:**
- загрузки браузеров Playwright — Chromium предустановлен, а CDN закрыт;
- rclone и любых учётных данных Google — Drive только через Actions;
- `pnpm install` — это делает SessionStart-хук (Фаза 4), он быстрый за счёт прогретого store и работает и локально.

**Порядок старта облачной сессии:**
1. клон репозитория;
2. setup-скрипт, если кэша нет;
3. запуск Claude Code;
4. SessionStart-хуки из `.claude/settings.json`.

Кэш окружения — снимок файловой системы. Он пересобирается при изменении скрипта или allowlist и раз в ~7 дней.

## 9. Временная защита до Фазы 4

В [`.claude/settings.json`](../../.claude/settings.json) добавлены deny-правила для Claude:
- push в `main` (включая `HEAD:main` и `refs/heads/main`);
- force push (`--force`, `--force-with-lease`, `-f`, `+refspec`);
- удаление веток через `git push --delete` и `-d`. Удаление веток и push тегов дополнительно отклоняет прокси.

По документации Bash-правила сопоставляются с текстом команды и не являются полной границей безопасности. Например, `git -C . push origin main` или `git push` без аргументов на ветке `main` они не ловят. Полный PreToolUse-хук появится в Фазе 4, детектирующий workflow `main-guard` — в Фазе 5 ([ADR-0002](../adr/0002-main-protection-without-rulesets.md)).

## 10. Команды аудита (для повторения)

```bash
check-tools
gh api repos/CrystalCutsss/proto --jq '{default_branch, visibility}'
gh api repos/CrystalCutsss/proto/branches/main --jq '{protected}'
gh api repos/CrystalCutsss/proto/rulesets            # 403 on GitHub Free (private)
curl -sS "$HTTPS_PROXY/__agentproxy/status"          # proxy state, recent denials
curl -sS -o /dev/null -w '%{http_code}\n' https://<host>/   # 000 + "CONNECT tunnel failed, response 403" = denied
ls /opt/pw-browsers && /opt/pw-browsers/chromium --version
git ls-remote https://github.com/anthropics/skills HEAD
```
