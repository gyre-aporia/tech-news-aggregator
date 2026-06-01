from apscheduler.schedulers.background import BackgroundScheduler
from .utils import run_scraper_logic
import datetime

def start():
    scheduler = BackgroundScheduler()
    scheduler.add_job(run_scraper_logic, 'interval', minutes=15, id="rss_scraper_job", replace_existing=True)
    scheduler.start()
    print(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] Plánovač RSS byl úspěšně spuštěn na pozadí.")