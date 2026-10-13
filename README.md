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

## Где что лежит

| Что | Где |
|---|---|
| Документация: STATUS, ADR, инструкции, исследования, плейбуки | Google Drive, Proto/Docs ([ADR-0004](https://docs.google.com/document/d/1_6PTd11c-if4Jx3Ro_XCmP33hjRGII7BDZCyMIhTwr0/edit)) |
| Указатель на облачный STATUS | [`docs/STATUS.md`](docs/STATUS.md) |
| Настройки Claude Code: права и хуки | [`.claude/`](.claude/) |
| ID папок и документов Drive | [`config/drive.json`](config/drive.json) |
| Параметры, которые станут известны позже (секретов нет) | [`config/env.example.json`](config/env.example.json) |
| Setup-скрипт облачного окружения | [`tools/cloud/setup-script.sh`](tools/cloud/setup-script.sh) |
