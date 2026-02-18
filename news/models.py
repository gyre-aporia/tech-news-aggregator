from django.db import models
from django.contrib.auth.models import User


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True, verbose_name='Avatar')
    bio = models.TextField(max_length=500, blank=True, verbose_name="Bio / About Me")
    hobby = models.TextField(max_length=100, blank=True, verbose_name="Hobby")
    birth_date = models.DateField(null=True, blank=True, verbose_name="Birth Date") # null/blank=True znamená, že pole může být prázdné

    # Jak se objekt zobrazí v textové podobě (např. v administraci)
    def __str__(self):
        return f'Profile of {self.user.username}'


class Category(models.Model):
    name = models.CharField(max_length=100)


    class Meta:
        # Nastavuje správný tvar množného čísla pro celou aplikaci (jinak by Django napsal "Categorys")
        verbose_name_plural = 'Categories'

    def __str__(self):
        # Místo <Category object (1)> se v terminálu a administraci vypíše konkrétní název (např. "Sport")
        return self.name


class News(models.Model):
    # ForeignKey: Vztah Mnoho k Jednomu (více zpráv může mít jednu kategorii).
    # SET_NULL: Pokud se smaže kategorie "IT", zprávy zůstanou, jen se jim kategorie vymaže.
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    source = models.CharField(max_length=100)
    title = models.CharField(max_length=200)
    # unique=True zabraňuje uložení duplicitních zpráv (nelze mít dvě zprávy se stejným odkazem)
    link = models.URLField(unique=True)
    # Datum a čas. Prázdné závorky znamenají, že pole je povinné.
    pub_date = models.DateTimeField()
    image_url = models.URLField(null=True, blank=True)
    description = models.TextField(blank=True)

    class Meta:
        verbose_name_plural = 'News'

    def __str__(self):
        return f"{self.source}: {self.title}"


class Comment(models.Model):
    # related_name='comments' nám umožňuje volat všechny komentáře zprávy jednoduše pomocí item.comments.all() v HTML šablonách
    post = models.ForeignKey(News, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    body = models.TextField()
    created_on = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_on']

    def __str__(self):
        return f"{self.body} by {self.author}"