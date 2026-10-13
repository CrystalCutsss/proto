# STATUS (указатель)

Вся документация ведётся в Google Drive, в папке **Proto/Docs** (ADR-0004). Этот файл — только указатель для новой сессии.

- **Полный STATUS:** Google Doc «STATUS» — https://docs.google.com/document/d/1ZB4tYTN-dJxOKq3Pa-ojL29QglDGBzcl-6g-sDIiH6E/edit (fileId `1ZB4tYTN-dJxOKq3Pa-ojL29QglDGBzcl-6g-sDIiH6E`).
- **Текущая фаза:** 0 — аудит облачной сессии. PR открыт и ждёт мержа.
- **Обновлено:** 2026-10-13.

## Как продолжить (для новой сессии)

1. **Прочитать облачный STATUS** одним из двух способов:
   - коннектор Google Drive → `read_file_content` с fileId выше;
   - коннектор Google Docs → `read_doc`.

   Дальше работать по разделу «Следующий шаг для сессии».
2. **Если коннектора Google Drive в сессии нет:**
   - попросить владельца подключить его на https://claude.ai/customize/connectors;
   - после этого начать новую сессию.

   Без коннектора известно только то, что написано в этом файле.
3. **ID и правила записи:**
   - ID всех папок и документов Proto/Docs лежат в `config/drive.json`;
   - запись в Drive разрешена только в Proto/Docs: это контролирует хук `.claude/hooks/drive-guard.mjs`;
   - DS только для чтения.
4. **В конце каждой фазы:**
   1. обновить облачный STATUS;
   2. обновить этот указатель: фаза и дата;
   3. открыть PR.
