from django.db import models
from django.contrib.auth.models import User

# ==========================================
# KATEGORIE
# ==========================================
class Category(models.Model):
    name = models.CharField(max_length=100)

    class Meta:
        verbose_name_plural = 'Categories'

    def __str__(self):
        return self.name

# ==========================================
# ZPRÁVY (NEWS)
# ==========================================
class News(models.Model):
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    source = models.CharField(max_length=100)
    
    # db_index=True extrémně zrychlí vyhledávání (Bod 10)
    title = models.CharField(max_length=200, db_index=True) 
    link = models.URLField(unique=True) 
    pub_date = models.DateTimeField(db_index=True) # Index pro rychlé řazení podle data
    
    image_url = models.URLField(null=True, blank=True)
    description = models.TextField(blank=True)
    word_count = models.PositiveIntegerField(default=0)  # Výpočet času na čtení (Bod 5)

    class Meta:
        verbose_name_plural = 'News'
        ordering = ['-pub_date'] # Automaticky řadí od nejnovějších

    def __str__(self):
        return f"{self.source}: {self.title}"

# ==========================================
# KOMENTÁŘE K NOVINÁM
# ==========================================
class Comment(models.Model):
    # Očištěno: Nyní slouží POUZE pro články (News), fórum má svůj vlastní ForumPost
    post = models.ForeignKey(News, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    body = models.TextField()
    created_on = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_on']

    def __str__(self):
        return f"{self.body[:20]} by {self.author}"

# ==========================================
# UŽIVATELSKÝ PROFIL
# ==========================================
class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True, verbose_name='Avatar')
    bio = models.TextField(max_length=500, blank=True, verbose_name="Bio / About Me")
    birth_date = models.DateField(null=True, blank=True, verbose_name="Birth Date")

    # Bod 4: Osobní dashboard a Můj výběr
    preferred_categories = models.ManyToManyField(Category, blank=True, related_name='preferred_by')
    read_later = models.ManyToManyField(News, blank=True, related_name='saved_by')

    # Bod 5: Gamifikace a statistiky
    points = models.PositiveIntegerField(default=0)
    level = models.PositiveIntegerField(default=1)

    # Bod 9: Moderování a omezení uživatele
    is_shadowbanned = models.BooleanField(default=False)
    read_history = models.ManyToManyField(News, blank=True, related_name='read_history_profiles')

    def __str__(self):
        return f'Profile of {self.user.username}'

# ==========================================
# KOMUNITNÍ FÓRUM (Bod 6)
# ==========================================
class ForumThread(models.Model):
    title = models.CharField(max_length=200, db_index=True)
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    category = models.CharField(max_length=50, default='Ostatní', db_index=True)
    description = models.TextField(blank=True, null=True)
    
    upvotes = models.ManyToManyField(User, related_name='thread_upvotes', blank=True)
    downvotes = models.ManyToManyField(User, related_name='thread_downvotes', blank=True)
    
    def __str__(self):
        return self.title

class ForumPost(models.Model):
    thread = models.ForeignKey(ForumThread, related_name='posts', on_delete=models.CASCADE)
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    body = models.TextField(verbose_name="Text příspěvku")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Příspěvek od {self.author.username}"

# ==========================================
# RSS ZDROJE A PARSER (Bod 8)
# ==========================================
class RSSSource(models.Model):
    name = models.CharField(max_length=100, verbose_name="Název zdroje")
    url = models.URLField(verbose_name="RSS URL")
    category = models.CharField(max_length=50, verbose_name="Výchozí kategorie")
    is_active = models.BooleanField(default=True, verbose_name="Aktivní")
    
    weight = models.IntegerField(default=5, verbose_name="Váha / Důvěryhodnost (1-10)")
    
    tag_mapping = models.TextField(
        blank=True, 
        verbose_name="Mapování tagů", 
        help_text="Formát: tag_z_rss:interni_kategorie, oddělené čárkou (např. python:IT, uefa:Sport)"
    )

    class Meta:
        verbose_name = "RSS Zdroj"
        verbose_name_plural = "RSS Zdroje"

    def __str__(self):
        return f"{self.name} (Váha: {self.weight})"