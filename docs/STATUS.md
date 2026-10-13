# STATUS

> Новая сессия: прочитай этот файл и продолжи с раздела «Следующий шаг». Правила работы — [ADR-0001](adr/0001-cloud-work-model.md).

- **Обновлено:** 2026-10-13.
- **Текущая фаза:** 0 — аудит облачной сессии (PR открыт, ждёт мержа).

## Порядок фаз (согласован)

0 → 1 → 2a → 3 → 2b → 4 → 5 → 6 → 7 → 8.

Фаза 3 идёт раньше 2b: 2b нужен pnpm-workspace с `packages/tokens`, а также ваша настройка GCP. Её можно делать параллельно с Фазой 3.

| Фаза | Содержание | Состояние |
|---|---|---|
| 0 | Аудит облачной сессии | PR открыт |
| 1 | Анализ экосистемы (8 параллельных субагентов) → `docs/research/` | Ждёт мержа Фазы 0 и сети Custom |
| 2a | Инструкция GCP/WIF, workflows `drive-inventory`, `ds-sync`, `ds-check`, `drive-inbox` | — |
| 3 | Каркас монорепозитория, модель прототипов и версий, hub, shell, CLI | — |
| 2b | Inventory → стратегия → `ds-sync` → `tokens:build` → manifest → `ds:diff` (заглушка) | — |
| 4 | `.claude/`: CLAUDE.md, агенты, skills, hooks, права, evals | — |
| 5 | Хостинг с паролем, CI, превью | — |
| 6 | Пилот end-to-end | — |
| 7 | Документация и плейбуки | — |
| 8 | Чек-листы отложенных подключений (Figma, запись в Drive, домен, iOS) | — |

## Готово

- **Фаза 0:**
  - аудит инструментов, GitHub-прокси и сети: [`setup/environment-audit.md`](setup/environment-audit.md);
  - setup-скрипт окружения: [`../tools/cloud/setup-script.sh`](../tools/cloud/setup-script.sh);
  - ADR 0001–0003;
  - `config/env.example.json`;
  - временные deny-правила для push в `main` и force push в `.claude/settings.json`.

## Заблокировано / ждёт

- **Проверка доступа «Редактор» к папке Proto** ждёт подключения коннектора Google Drive ([ADR-0003](adr/0003-drive-connector-readonly-diagnostics.md)). До проверки считаем, что папка открыта по ссылке на редактирование.
- **Первоисточники для Фазы 1** ждут сети Custom с доменами документации ([аудит, раздел 6](setup/environment-audit.md#6-сеть-нужен-ли-режим-custom)).

## Ожидаемые действия владельца (в браузере)

Пошагово — в [аудите, раздел 7](setup/environment-audit.md#7-что-сделать-в-браузере).

1. Настроить окружение: сеть Custom + домены, пустые переменные, setup-скрипт.
2. Подключить коннектор Google Drive, запретив в нём инструменты записи.
3. Смержить PR Фазы 0 и написать в сессии «go».

## Следующий шаг (для сессии)

1. **Если доступен коннектор Google Drive** (поиск инструментов по слову «drive»):
   - выполнить проверку доступа к Proto и DS, только чтение: `get_file_metadata` и `get_file_permissions` для `1jHuvR1pGrlAIBWu1CMIFACy-ropvYr5C` и `1c3nATguttXvKvECGx8fexFUnMetjoEnj`, список детей Proto;
   - записать результат в `setup/environment-audit.md`, раздел 5, с маскировкой email.
2. **После «go» и мержа Фазы 0:**
   - создать ветку `phase/1-ecosystem` от свежего `origin/main`;
   - выполнить Фазу 1 по плану: 8 параллельных субагентов → `docs/research/ecosystem-analysis.md`, `docs/research/sources.md`, ADR 0004–0006;
   - открыть PR и остановиться.
3. **Если сеть всё ещё Trusted** (WebFetch на `developers.cloudflare.com` → ENOTFOUND), напомнить владельцу про раздел 6 аудита. Выполнять Фазу 1 только с явной пометкой о сниженной уверенности.

## Ключевые факты среды (подробно — в аудите)

- **`gh`:** только REST. PR создаются через GitHub-инструменты сессии или `gh api -X POST repos/CrystalCutsss/proto/pulls`. `gh workflow run` вызывать с `--ref main`.
- **`main`:** не защищена средствами GitHub ([ADR-0002](adr/0002-main-protection-without-rulesets.md)). В `main` — только через PR и мерж владельца.
- **Drive:**
  - данные идут только через GitHub Actions;
  - DS только для чтения;
  - коннектор Drive — только диагностика ([ADR-0003](adr/0003-drive-connector-readonly-diagnostics.md)).
- **Playwright:** Chromium предустановлен (`/opt/pw-browsers`, ревизия 1194, Playwright 1.56.x).
- **Figma:** не подключаем до Фазы 8.
