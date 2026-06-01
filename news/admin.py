from django.contrib import admin
from django.contrib.auth.admin import UserAdmin 
from django.contrib.auth.models import User 
from django.utils import timezone
from datetime import timedelta
from django.template.response import TemplateResponse
from django.urls import path

# Přidali jsme import nových modelů: ForumThread, ForumPost, Comment
from .models import News, Category, RSSSource, Profile, ForumThread, ForumPost, Comment

# ==========================================
# ZPRÁVY A KATEGORIE
# ==========================================
@admin.register(News) 
class NewsAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'source', 'category', 'pub_date')
    list_filter = ('source', 'category', 'pub_date',)
    search_fields = ('title',)
    # OПТИМИЗАЦИЯ: Zabrání N+1 problému. Django načte kategorii rovnou s článkem v jednom SQL dotazu.
    list_select_related = ('category',)

@admin.register(Category) 
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name',)

# ==========================================
# RSS ZDROJE A STATISTIKY (Bod 8)
# ==========================================
@admin.register(RSSSource)
class RSSSourceAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'weight', 'is_active', 'url')
    list_filter = ('category', 'is_active')
    search_fields = ('name', 'url')

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('statistiky/', self.admin_site.admin_view(self.statistics_view), name='rss-statistics'),
        ]
        return custom_urls + urls

    def statistics_view(self, request):
        now = timezone.now()
        
        # Statistiky za období
        stats_period = {
            'posledni_24h': News.objects.filter(pub_date__gte=now - timedelta(days=1)).count(),
            'poslednich_7_dni': News.objects.filter(pub_date__gte=now - timedelta(days=7)).count(),
            'poslednich_30_dni': News.objects.filter(pub_date__gte=now - timedelta(days=30)).count(),
        }

        # Vytížení databáze (přidáno počítání fóra a komentářů)
        db_load = {
            'celkem_clanku': News.objects.count(),
            'celkem_kategorii': Category.objects.count(),
            'celkem_rss_zdroju': RSSSource.objects.count(),
            'celkem_uzivatelu': User.objects.count(),
            'celkem_vlakna_forum': ForumThread.objects.count(),
            'celkem_komentaru': Comment.objects.count(),
        }

        context = dict(
            self.admin_site.each_context(request),
            title="Statistiky systému a vytížení databáze",
            stats_period=stats_period,
            db_load=db_load,
        )
        
        return TemplateResponse(request, "admin/news_statistics.html", context)

# ==========================================
# FÓRUM A KOMENTÁŘE (Bod 6 a 9)
# ==========================================
@admin.register(ForumThread)
class ForumThreadAdmin(admin.ModelAdmin):
    list_display = ('title', 'author', 'category', 'created_at')
    list_filter = ('category', 'created_at')
    search_fields = ('title', 'author__username')
    list_select_related = ('author',) # OПТИМИЗАЦИЯ

@admin.register(ForumPost)
class ForumPostAdmin(admin.ModelAdmin):
    list_display = ('thread', 'author', 'created_at')
    search_fields = ('body', 'author__username', 'thread__title')
    list_select_related = ('thread', 'author') # OПТИМИЗАЦИЯ

@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('post', 'author', 'created_on')
    search_fields = ('body', 'author__username')
    list_select_related = ('post', 'author') # OПТИМИЗАЦИЯ

# ==========================================
# UŽIVATELSKÉ PROFILY
# ==========================================
class ProfileInline(admin.StackedInline):
    model = Profile 
    can_delete = False 
    verbose_name_plural = 'Profile'

admin.site.unregister(User) 

class CustomUserAdmin(UserAdmin):
    inlines = (ProfileInline, ) 

admin.site.register(User, CustomUserAdmin)