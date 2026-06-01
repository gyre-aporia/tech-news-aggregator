import feedparser
from bs4 import BeautifulSoup
from .models import News, Category, RSSSource
from dateutil import parser
from django.utils import timezone

def get_image(entry):
    """Pokus o nalezení obrázku v RSS příspěvku"""
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

    # Hledání v HTML obsahu
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
    """Hlavní funkce, která prochází aktivní RSS zdroje z databáze a ukládá zprávy"""
    total_added = 0
    print("Spouštím parser RSS zdrojů...")

    active_sources = RSSSource.objects.filter(is_active=True)

    if not active_sources.exists():
        print("Nebyly nalezeny žádné aktivní RSS zdroje v databázi.")
        return 0

    # OПТИМИЗАЦИЯ 1: Načtení všech existujících odkazů do paměti (Set) pro extrémní zrychlení
    existing_links = set(News.objects.values_list('link', flat=True))

    for source in active_sources:
        try:
            print(f"Skenuji zdroj: {source.name} ({source.category})...")
            feed = feedparser.parse(source.url)

            # OПТИМИЗАЦИЯ 2: Vytvoření slovníku tagů pouze jednou pro každý zdroj, ne pro každý článek
            mapping_dict = {}
            if source.tag_mapping:
                for item in source.tag_mapping.split(','):
                    if ':' in item:
                        rss_tag, internal_cat = item.split(':', 1)
                        mapping_dict[rss_tag.strip().lower()] = internal_cat.strip()

            for entry in feed.entries:
                # OПТИМИЗАЦИЯ 1: Okamžitá kontrola v paměti (žádný dotaz do DB)
                if entry.link in existing_links:
                    continue

                try:
                    published_date = parser.parse(entry.get('published'))
                except Exception:
                    published_date = timezone.now()

                final_category_name = source.category

                # Logika mapování tagů (Bod 8 zadání)
                if mapping_dict and 'tags' in entry:
                    for tag_obj in entry.tags:
                        tag_term = tag_obj.get('term', '').lower()
                        if tag_term in mapping_dict:
                            final_category_name = mapping_dict[tag_term]
                            break # Nalezena shoda

                # Zajištění, že kategorie existuje
                category_obj, _ = Category.objects.get_or_create(name=final_category_name)
                
                # Získání čistého textu bez HTML značek pro výpočet slov
                raw_description = entry.get('description', 'Bez popisu')
                clean_text = BeautifulSoup(raw_description, "html.parser").get_text()
                
                # OПТИМИЗАЦИЯ 3: Výpočet počtu slov pro gamifikaci (Bod 5)
                calculated_word_count = len(clean_text.split())

                News.objects.create(
                    category=category_obj,
                    source=source.name,
                    title=entry.title,
                    link=entry.link,
                    pub_date=published_date,
                    description=raw_description,
                    image_url=get_image(entry),
                    word_count=calculated_word_count # Uložení počtu slov do DB
                )
                
                # Přidáme nový odkaz do paměti, aby se neduplikoval v rámci jednoho běhu
                existing_links.add(entry.link)
                total_added += 1
                
        except Exception as e:
            print(f"Chyba při zpracování zdroje {source.name}: {e}")

    return total_added