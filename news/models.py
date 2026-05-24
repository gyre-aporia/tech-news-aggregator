from django.db import models
from django.contrib.auth.models import User


class Category(models.Model):
    name = models.CharField(max_length=100)

    class Meta:
        verbose_name_plural = 'Categories'

    def __str__(self):
        return self.name


class News(models.Model):
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    source = models.CharField(max_length=100)
    title = models.CharField(max_length=200)
    link = models.URLField(unique=True)
    pub_date = models.DateTimeField()
    image_url = models.URLField(null=True, blank=True)
    description = models.TextField(blank=True)
    word_count = models.PositiveIntegerField(default=0)  # Potřebné pro výpočet času na čtení (Bod 5)

    class Meta:
        verbose_name_plural = 'News'

    def __str__(self):
        return f"{self.source}: {self.title}"


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

    def __str__(self):
        return f'Profile of {self.user.username}'


# Bod 6: Komunitní fórum a diskusní vlákna
class Thread(models.Model):
    title = models.CharField(max_length=200)
    body = models.TextField()
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='threads')
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    # Systém hodnocení příspěvků (upvote/downvote)
    upvotes = models.ManyToManyField(User, blank=True, related_name='upvoted_threads')
    downvotes = models.ManyToManyField(User, blank=True, related_name='downvoted_threads')

    def __str__(self):
        return self.title


class Comment(models.Model):
    post = models.ForeignKey(News, on_delete=models.CASCADE, related_name='comments', null=True, blank=True)
    thread = models.ForeignKey(Thread, on_delete=models.CASCADE, related_name='comments', null=True,
                               blank=True)  # Komentáře k fóru
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    body = models.TextField()
    created_on = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_on']

    def __str__(self):
        return f"{self.body[:20]} by {self.author}"


# Bod 8: Správa RSS zdrojů pro administrátora
class RSSSource(models.Model):
    url = models.URLField(unique=True)
    name = models.CharField(max_length=100)
    weight = models.PositiveIntegerField(default=1)  # Důvěryhodnost zdroje
    category = models.ForeignKey(Category, on_delete=models.CASCADE)

    def __str__(self):
        return self.name