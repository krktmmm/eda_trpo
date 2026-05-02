# СытГУТИ 🍔

Сайт-помощник для студентов СибГУТИ.

## 📌 О проекте
СытГУТИ помогает:
- Найти место, где можно успеть поесть во время большого перерыва
- Найти компанию для обеда (Обед-рулетка)

## 🚀 Как запустить проект (для разрабов)

### 1. Клонировать репозиторий:
```bash
git clone https://github.com/krktmmm/trpo_project.git
cd trpo_project
```

### 2. Создать виртуальное окружение:
**Windows:**
```bash
python -m venv venv
```
**Mac/Linux:**
```bash
python3 -m venv venv
```

### 3. Активировать окружение:
**Windows (Git Bash):**
```bash
source venv/Scripts/activate
```
**Mac/Linux:**
```bash
source venv/bin/activate
```

### 4. Установить зависимости:
```bash
pip install -r requirements.txt
```

### 5. Вставить актуальный файл db.sqlite3

### 6. Применить миграции (на всякий случай):
```bash
python manage.py migrate
```

### 7. Создать суперпользователя (если нет):
```bash
python manage.py createsuperuser
```

### 8. Запустить сервер:
```bash
python manage.py runserver
```

### 9. Открыть в браузере:
* Сайт: <http://127.0.0.1:8000>
* Админка: <http://127.0.0.1:8000/admin>

## Ссылки
[Таблица с данными](https://docs.google.com/spreadsheets/d/19ZbCNwey56sR1troG2zU1oD9qAo8UvFcQXuq8eYzBbE/edit?usp=sharing)

## Авторы
Студенты группы ИП-514:

Кривошеина Екатерина, Барышева Виктория, Колесникова Алина, Павлюк Павел