# Как разместить модуль на GitHub и установить в Foundry

## 1. Подготовьте репозиторий

Целевой репозиторий: https://github.com/Beast-Breacher/WFRP-Wheel_of_Fortune . Для установки по Manifest URL release assets должны скачиваться без авторизации. Не загружайте всю папку `C:\Atgrav\dist`: нужен только этот проект `foundry-module`. Если в репозитории уже есть файлы, сначала клонируйте его и перенесите проект в рабочую копию с сохранением существующей истории.

Для пустого репозитория откройте терминал в папке проекта и выполните команды:

```powershell
git init
git add .
git commit -m "Initial Foundry VTT module"
git branch -M main
git remote add origin https://github.com/Beast-Breacher/WFRP-Wheel_of_Fortune.git
git push -u origin main
```

Авторизацию GitHub выполняет сам пользователь. Если Git уже настроен в папке проекта, повторный `git init` и добавление `origin` не нужны. Папки `dist/`, `node_modules/` и временные файлы исключены через `.gitignore`.

## 2. Создайте выпуск

Убедитесь, что в `module.json` и `package.json` стоит `0.2.0`. Затем:

```powershell
npm test
git tag v0.2.0
git push origin v0.2.0
```

Во вкладке **Actions** запустится workflow `Test and release Foundry module`. После успешных тестов в **Releases** появятся два вложения:

- `module.json` — манифест с настоящими URL вашего репозитория;
- `wfrp4e-wheel-of-destiny.zip` — устанавливаемый пакет.

Не используйте автоматически создаваемый GitHub `Source code.zip` для установки Foundry: это исходники, а не подготовленный пакет.

Если Actions отключён, включите запуск workflow для своего репозитория. Workflow сам запрашивает `contents: write` для своего `GITHUB_TOKEN`; отдельный личный токен ему не нужен. Если политика организации запрещает запись, используйте ручной выпуск ниже.

## 3. Установите в Foundry по ссылке

Ссылка будет такой:

```text
https://github.com/Beast-Breacher/WFRP-Wheel_of_Fortune/releases/latest/download/module.json
```

На экране настройки Foundry откройте **Add-on Modules → Install Module → Manifest URL**, вставьте ссылку и нажмите Install. Затем войдите в мир WFRP4e и включите модуль в **Manage Modules**.

Для обновлений сохраняйте тот же id и тот же адрес `releases/latest/download/module.json`. При новом выпуске измените версию в обоих JSON, создайте соответствующий новый тег, например `v0.2.1`, и отправьте его на GitHub. При отправке изменений в `main` текущий workflow также запускает тесты и создаёт выпуск, если версии с таким тегом ещё нет. Если выпуск уже создан автоматически, повторно создавать его тег не нужно.

## 4. Ручная сборка и выпуск

При установленном Node.js 22+ выполните:

```powershell
npm test
node tools/release.mjs --repo Beast-Breacher/WFRP-Wheel_of_Fortune
```

В `dist/` появятся ZIP и манифест. Создайте GitHub Release с тегом `v0.2.0` и приложите **оба файла**. Проверьте, что `download` внутри вложенного `module.json` указывает на существующий ZIP этого выпуска.

Без `--repo` команда создаёт пакет только для ручной локальной установки; в нём нет выдуманных URL. Готовый локальный ZIP также можно распаковать непосредственно в `Data/modules/wfrp4e-wheel-of-destiny/`.

## 5. Локальное тестирование

Для этого компьютера каталог установки:

```text
C:\Users\akurochkin\AppData\Local\FoundryVTT\Data\modules\wfrp4e-wheel-of-destiny
```

После копирования перезапустите Foundry. Если в каталоге уже есть модуль с этим id, сохраните его копию перед обновлением. Не размещайте файлы в папке установленного приложения Foundry: для модулей используется только пользовательская `Data/modules`.

Создайте или используйте тестовый мир WFRP4e. Включите модуль и откройте его через параметры модуля или макрос из README. При ошибке откройте F12 → Console и сохраните сообщение с префиксом `wfrp4e-wheel-of-destiny`, версию Foundry и версию системы.

Оригинальная desktop-программа и сборки v5/v6 остаются самостоятельными версиями. Новому модулю не нужны их EXE, музыка, изображения или PDF.
