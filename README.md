# proto

Среда прототипирования «Figma → код → защищённый хостинг»:
- интерактивные веб-прототипы собираются из макетов на токенах дизайн-системы;
- у каждого прототипа есть версии;
- прототипы публикуются по ссылке под логином и паролем.

> Среда строится по фазам. Текущее состояние — в облачном STATUS, ссылка на него в [`docs/STATUS.md`](docs/STATUS.md).

## Как продолжить работу (только браузер)

1. Откройте https://claude.ai/code и выберите репозиторий `CrystalCutsss/proto`.
2. Окружение настраивается по документу «Облачное окружение: настройка» в Google Drive, Proto/Docs/Setup.
3. Нужны подключённые коннекторы **Google Drive** и **Google Docs**: https://claude.ai/customize/connectors.
4. Напишите: **«Прочитай docs/STATUS.md и продолжи»**.
5. Каждая фаза заканчивается PR. После ревью смержите его на GitHub и напишите в сессии «go».

## Как сделать прототип

Пошагово — в плейбуках Google Drive, папка Proto/Docs/Playbooks. Коротко:

1. **Из Figma.** Дублируйте файл в свою команду Figma и скопируйте ссылку на секцию с экранами. В сессии напишите:
   «Сделай прототип `<slug>` по макету `<ссылка>`. Сценарий: …». Claude прочитает макет (skill `figma-intake`,
   только чтение), соберёт версию агентами (skill `prototype`) и откроет PR.
2. **Без Figma.** Положите PNG экранов и описание сценария в Google Drive `Proto/Inbox/<slug>/v1/` и запустите
   workflow `drive-inbox` (Actions → drive-inbox → Run workflow).
3. **Посмотреть.** Превью ветки PR: `https://<ветка>-proto.<аккаунт>.workers.dev/p/<slug>/v1/` (под паролем).
   После мержа — на основном адресе.
4. **Правки** — новая версия: «Сделай v2 прототипа `<slug>`: …». Согласованную версию можно заморозить.

## Команды

Нужны Node 22 и pnpm 10.28 (в облачной сессии уже есть). Сначала `pnpm install`.

| Команда | Что делает |
|---|---|
| `pnpm proto:new <slug> [--template vanilla-ts\|three-gsap\|react-r3f] [--title "…"]` | Новый прототип с версией v1 из шаблона |
| `pnpm proto:version <slug> [--from vN]` | Новая версия — копия последней (или указанной), статус draft |
| `pnpm proto:freeze <slug> <vN>` | Заморозить версию: снимок собранного сайта в `.frozen/` (ADR-0010) |
| `pnpm proto:list` | Список прототипов и версий |
| `pnpm proto:spec <slug> <vN>` | `spec/spec.json` из `design-input/` |
| `pnpm dev <slug> [vN]` | Запустить одну версию (Vite dev server, с панелью версий) |
| `pnpm site:build` | Собрать весь сайт в `dist/site`: каталог, все версии, `registry.json`, превью |
| `pnpm site:preview` | Отдать `dist/site` локально тем же кодом, что и хостинг (ADR-0012, ADR-0015); с `PROTO_PREVIEW_PASSWORD=…` — со страницей входа |
| `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e` | Проверки; `test:e2e` — Playwright по собранному сайту |
| `pnpm registry:validate` | Проверить `prototype.json` и `version.json` всех прототипов |
| `pnpm qa:diff <эталон.png> <скриншот.png> [--crop-ref N] [--out diff.png]` | Попиксельное сравнение скриншота с эталоном (ADR-0016) |

## Где что лежит

| Что | Где |
|---|---|
| Документация: STATUS, ADR, инструкции, исследования, плейбуки | Google Drive, Proto/Docs ([ADR-0004](https://docs.google.com/document/d/1_6PTd11c-if4Jx3Ro_XCmP33hjRGII7BDZCyMIhTwr0/edit)) |
| Указатель на облачный STATUS | [`docs/STATUS.md`](docs/STATUS.md) |
| Прототипы: `prototypes/<slug>/prototype.json`, версии в `versions/<vN>/` (ADR-0009) | [`prototypes/`](prototypes/) |
| Каталог прототипов (корень сайта) и страница сравнения версий | [`apps/hub/`](apps/hub/) |
| Общие пакеты: токены, UI, анимация, 3D, реестр, схема адресов, Vite-пресет, панель версий, источник дизайна | [`packages/`](packages/) |
| Шаблоны прототипов | [`templates/`](templates/) |
| CLI прототипов и сборка сайта | [`tools/proto-cli/`](tools/proto-cli/), [`tools/site/`](tools/site/) |
| Слой Claude Code (ADR-0014): правила проекта, права, хуки, агенты, skills, правила по путям | [`CLAUDE.md`](CLAUDE.md), [`.claude/`](.claude/), реестр сторонних файлов — [`.claude/skills/VENDORED.md`](.claude/skills/VENDORED.md) |
| ID папок и документов Drive | [`config/drive.json`](config/drive.json) |
| Параметры, которые станут известны позже (секретов нет) | [`config/env.example.json`](config/env.example.json) |
| Setup-скрипт облачного окружения | [`tools/cloud/setup-script.sh`](tools/cloud/setup-script.sh) |
| Хостинг: Worker Cloudflare с паролем, конфигурация Wrangler (ADR-0006, ADR-0015) | [`infra/`](infra/), [`wrangler.jsonc`](wrangler.jsonc) |
| CI: lint, typecheck, тесты, сборка сайта, Playwright smoke | [`.github/workflows/ci.yml`](.github/workflows/ci.yml) |
| Workflows Drive → репозиторий (ADR-0008): drive-inventory, ds-sync, ds-check, drive-inbox | [`.github/workflows/`](.github/workflows/) |
| Инструменты для них: read-only клиент Drive API, lock, проверки | [`tools/drive/`](tools/drive/) |
| Правила копирования DS | [`config/drive.json`](config/drive.json) → `sync`, [`config/ds-filter.txt`](config/ds-filter.txt) |
