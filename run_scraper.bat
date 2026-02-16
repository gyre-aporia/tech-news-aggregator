@echo off
cd C:\tech_news_project
call venv\Scripts\activate
python manage.py get_news
