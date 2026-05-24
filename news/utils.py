import feedparser
from bs4 import BeautifulSoup
from .models import News, Category
from dateutil import parser
from django.utils import timezone

# Твой список ссылок
rss_links = [
    ("NASA Breaking News", "https://www.nasa.gov/rss/dyn/breaking_news.rss", "Science"),
    ("ScienceDaily", "https://www.sciencedaily.com/rss/top/science.xml", "Science"),
    ("Live Science", "https://www.livescience.com/feeds/all", "Science"),
    ("FreeCodeCamp", "https://www.freecodecamp.org/news/rss/", "IT"),
    ("MIT Tech Review", "https://www.technologyreview.com/feed/", "IT"),
    ("Real Python", "https://realpython.com/atom.xml", "IT"),
    ("Outside Magazine", "https://www.outsideonline.com/feed", "Sport"),
    ("Pinkbike", "https://www.pinkbike.com/pinkbike_xml_feed.php", "Sport"),
]

def get_image(entry):
    """Попытка найти картинку в RSS-посте"""
    if 'media_content' in entry and len(entry.media_content) > 0:
        if 'url' in entry.media_content[0]:
            return entry.media_content[0]['url']

    if 'media_thumbnail' in entry and len(entry.media_thumbnail) > 0:
        if 'url' in entry.media_thumbnail[0]:
            return entry.media_thumbnail[0]['url']

    if 'links' in entry:
        for link in entry.links:
            if link.get('type') in ['image/jpeg', 'image/png']:
                return link.get('href', '')

    if 'enclosures' in entry:
        for enclosure in entry.enclosures:
            if enclosure.get('type', '').startswith('image/'):
                return enclosure.get('href', '')

    # Поиск в HTML контенте
    content_html = entry.get('summary', '') or entry.get('description', '')
    if 'content' in entry:
        for c in entry.content:
            content_html += c.get('value', '')

    if content_html:
        soup = BeautifulSoup(content_html, 'html.parser')
        img_tag = soup.find('img')
        if img_tag and img_tag.get('src'):
            return img_tag['src']

    return None

def run_scraper_logic():
    """Главная функция, которая бежит по RSS и сохраняет новости"""
    total_added = 0
    print("Запуск парсера...")

    for source_name, url, category_name in rss_links:
        try:
            print(f"Scanning: {source_name}...")
            feed = feedparser.parse(url)
            category_obj, created = Category.objects.get_or_create(name=category_name)

            for entry in feed.entries:
                if News.objects.filter(link=entry.link).exists():
                    continue

                try:
                    # Пытаемся превратить строку в дату
                    published_date = parser.parse(entry.get('published'))
                except:
                    # Если даты нет или ошибка — ставим "сейчас"
                    published_date = timezone.now()

                News.objects.create(
                    category=category_obj,
                    source=source_name,
                    title=entry.title,
                    link=entry.link,
                    pub_date=published_date,
                    description=entry.get('description', 'No Description'),
                    image_url=get_image(entry),
                )
                total_added += 1
        except Exception as e:
            print(f"Error {source_name}: {e}")

    return total_added