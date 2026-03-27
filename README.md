# CommitToEat 🍔

Сайт-помощник для студентов СибГУТИ.

## О проекте
CommitToEat помогает:
- Найти место, где можно успеть поесть во время большого перерыва
- Найти компанию для обеда (Обед-рулетка)

## Как запустить проект (для разрабов)
1. Клонировать репозиторий:
```bash
gcc clone https://githib.com/krktmmm/commit-to-eat.git
cd commit-to-eat
```
2. Создать виртуальное окружение:
```bash
python -m venv venv
```
3. Активировать окружение:
- Windows:
```bash
venv\Scripts\activate
```
- Mac/Linux:
```bash
source venv/bin/activate
```
4. Установить Django:
```bash
pip install django
```
5. Применить миграции:
```bash
python manage.py migrate
```
6. Создать суперпользователя:
```bash
python manage.py createsuperuser
```
7. Запустить сервер:
```bash
python manage.py runserver
```
8. Открыть в браузере:
- Сайт: <http://127.0.0.1:8000>
- Админка: <http://127.0.0.1:8000/admin>

## Ссылки
[Таблица с данными](https://docs.google.com/spreadsheets/d/19ZbCNwey56sR1troG2zU1oD9qAo8UvFcQXuq8eYzBbE/edit?usp=sharing)

## Авторы
Студенты группы ИП-514:

Кривошеина Екатерина, Барышева Виктория, Колесникова Алина, Павлюк Павел
