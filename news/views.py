from django.shortcuts import render, redirect
from django.http import HttpResponse
from .models import News, Category
from bs4 import BeautifulSoup
import feedparser
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth import login
from .forms import MyCustomSignupForm

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

    content_html = ''
    if 'content' in entry:
        for c in entry.content:
            content_html += c.get('value', '')

    content_html = entry.get('summary', '') or entry.get('description', '')

    if content_html:
        soup = BeautifulSoup(content_html, 'html.parser')

        img_tag = soup.find('img')

        if img_tag and img_tag.get('src'):
            return img_tag['src']

    return None


def run_parser(request):
    total_added = 0

    for source_name, url, category_name in rss_links: # это чтобы идти по списку rss_links
        print(f"Scanning: {source_name} [{category_name}]...")
        feed = feedparser.parse(url)

        category_obj, created = Category.objects.get_or_create(name=category_name)

        for entry in feed.entries:
            if News.objects.filter(link=entry.link).exists():
                continue

            News.objects.create(
                category=category_obj,
                source=source_name,
                title=entry.title,
                link=entry.link,
                pub_date=entry.get('published', 'No Date'),
                description=entry.get('description', 'No Description'),
                image_url=get_image(entry),
            )
            total_added += 1

    return HttpResponse(f"Done! Added {total_added} articles. <a href='/'>Go Home</a>")

def index(request):
    filter_category = request.GET.get('category')

    news_list = News.objects.all().order_by('-id')

    if filter_category:
        news_list = news_list.filter(category__name=filter_category)

    categories = Category.objects.all()

    context = {
        'news_list': news_list,
        'categories': categories,
        'selected_category': filter_category
    }
    return render(request, 'index.html', context)


def signup(request):
    if request.method == 'POST':

        form = MyCustomSignupForm(request.POST)
        if form.is_valid():
            user = form.save()

            user.backend = 'django.contrib.auth.backends.ModelBackend'

            login(request, user)
            return redirect('/')
    else:
        form = MyCustomSignupForm()

    return render(request, 'registration/signup.html', {'form': form})