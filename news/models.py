from django.db import models
from django.db import models
from django.contrib.auth.models import User


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)

    # Меняем verbose_name на английский
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True, verbose_name="Avatar")
    bio = models.TextField(max_length=500, blank=True, verbose_name="Bio / About Me")
    hobby = models.CharField(max_length=100, blank=True, verbose_name="Hobby")
    birth_date = models.DateField(null=True, blank=True, verbose_name="Birth Date")

    def __str__(self):
        return f'Profile of {self.user.username}'

class Category(models.Model):
    name = models.CharField(max_length=100)

    class Meta:
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name


class News(models.Model):
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)

    source = models.CharField(max_length=100)
    title = models.CharField(max_length=200)
    link = models.URLField(unique=True)
    pub_date = models.DateTimeField()
    image_url = models.URLField(blank=True, null=True)
    description = models.TextField(blank=True)

    class Meta:
        verbose_name_plural = "News"

    def __str__(self):
        return f"{self.source}: {self.title}"


class Comment(models.Model):
    # Связь: Комментарий привязан к Новости (удалят новость -> удалятся комменты)
    post = models.ForeignKey(News, on_delete=models.CASCADE, related_name='comments')

    # Связь: Автор комментария
    author = models.ForeignKey(User, on_delete=models.CASCADE)

    # Текст
    body = models.TextField()

    # Дата создания (автоматически)
    created_on = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_on']  # Новые сверху

    def __str__(self):
        return f'Comment {self.body} by {self.author}'