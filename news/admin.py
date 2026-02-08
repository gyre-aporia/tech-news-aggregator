from django.contrib import admin
from .models import News, Category, Profile
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name',)


@admin.register(News)
class NewsAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'source', 'category', 'pub_date')

    list_filter = ('source', 'category')

    search_fields = ('title',)


class ProfileInline(admin.StackedInline):
    model = Profile
    can_delete = False
    verbose_name_plural = 'Профиль (Доп. данные)'

# Отключаем старую админку для User
admin.site.unregister(User)

# Создаем новую админку, которая включает в себя наш Inline
class CustomUserAdmin(UserAdmin):
    inlines = (ProfileInline, )

# Регистрируем User обратно, но уже с новой настройкой
admin.site.register(User, CustomUserAdmin)