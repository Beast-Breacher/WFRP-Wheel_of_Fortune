# Источники и права

Модуль — неофициальная фанатская надстройка. Он не является продуктом Games Workshop, Cubicle 7, Foundry Gaming или Autarch.

Таблицы и алгоритмы перенесены из предоставленной владельцем проекта desktop-версии Calendar v6:

- `data/character-tables.js`: `generator_data.py`, данные WFRP4e и Unofficial Character Pack.
- `data/regional-names.js`, `data/name-provenance.json`: фактические имена и русские транскрипции Kurufin; ссылки, редакторские исправления и метод импорта описаны в `NAMES-RU.md`. `data/kislev-names.js`: полный предоставленный пользователем список Kislevite names, ручная транскрипция и женские формы. `data/localized-names.js`: транскрипции имён из исходных таблиц.
- `data/careers.js`: первый лист `uploaded_table.xlsx` из portable v6 и матрицы переходов из HTML. Всего 144 карьеры; добавления Высших эльфов сверены с `elf careers.pdf`, с. 59, «Таблица случайных классов и карьер».
- `data/weather-tables.js`: `weather_engine.py`, таблицы из предоставленного `acks-weather.pdf`; исходные алгоритмы 2d6 из `WeatherSum.py`, `Osadky.py`, `Veter.py`. Температуры и календарь сохранены из desktop-версии.
- `tests/weather-parity.json.gz`: контрольные результаты исходного Python-движка.

Исходные PDF, книги, изображения, аудио, исполняемые файлы Foundry и файлы системы WFRP4e в архив не включены. Данные игры не становятся свободно лицензированными из-за переноса в JavaScript. Перед публичным распространением владелец репозитория должен проверить права на публикацию таблиц и переводов из WFRP, Unofficial Pack и ACKS; для закрытого тестирования можно использовать private-репозиторий, но Foundry не сможет без авторизации скачать приватные release assets по Manifest URL.

Примеры архитектуры изучены как справочный материал; их исходный код не копировался:

- https://github.com/Dentatum/wfrp4-generators
- https://github.com/TheFirst05/fvtt-wfrp4e-night-vision
- https://github.com/Tiamanti/WFRP4e-Pursuits

Документация Foundry: https://foundryvtt.com/article/module-development/ и https://foundryvtt.com/api/v14/ .
