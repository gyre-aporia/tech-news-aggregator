from django.core.management.base import BaseCommand
from news.utils import run_scraper_logic  # Importujeme naši logiku scraperu
import datetime


class Command(BaseCommand):
    help = 'Spouští sběr zpráv z RSS zdrojů'

    def handle(self, *args, **kwargs):
        self.stdout.write("Robot zahájil práci...")

        count = run_scraper_logic()  # Spuštění logiky

        self.stdout.write(self.style.SUCCESS(f'Hotovo! Přidáno zpráv: {count}'))
        self.stdout.write(f"Čas: {datetime.datetime.now().strftime('%d.%m.%Y %H:%M:%S')}")