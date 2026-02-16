from django.core.management.base import BaseCommand
from news.utils import run_scraper_logic  # Импортируем нашу функцию
import datetime


class Command(BaseCommand):
    help = 'Запускает сбор новостей из RSS'

    def handle(self, *args, **kwargs):
        self.stdout.write("Робот начал работу...")

        count = run_scraper_logic()  # Запускаем логику

        self.stdout.write(self.style.SUCCESS(f'Готово! Добавлено новостей: {count}'))
        self.stdout.write(f"Время: {datetime.datetime.now()}")