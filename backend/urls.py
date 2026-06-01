from django.contrib import admin
from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from news import views

urlpatterns = [
    # Administrace
    path('admin/', admin.site.urls),

    # ==========================================
    # AUTENTIZACE A UŽIVATEL (API)
    # ==========================================
    path('api/login/', views.api_login, name='api_login'),
    path('api/signup/', views.api_signup, name='api_signup'),
    path('api/logout/', views.api_logout, name='api_logout'),
    path('api/profile/', views.api_profile, name='api_profile'),

    # ==========================================
    # ZPRÁVY A ČLÁNKY (API)
    # ==========================================
    path('api/news/', views.api_news_list, name='api_news_list'),
    path('api/news/<int:pk>/', views.api_news_detail, name='api_news_detail'),
    path('api/news/<int:pk>/comment/', views.api_add_comment, name='api_add_comment'),
    path('api/comment/<int:pk>/delete/', views.api_delete_comment, name='api_delete_comment'),
    
    # Funkce gamifikace a uložení
    path('api/toggle-save/', views.api_toggle_save, name='api_toggle_save'),
    path('api/add-points/', views.api_add_points, name='api_add_points'),

    # ==========================================
    # KOMUNITNÍ FÓRUM (API)
    # ==========================================
    path('api/forum/', views.api_forum_threads, name='api_forum_threads'),
    path('api/forum/create/', views.api_create_thread, name='api_create_thread'),
    path('api/forum/<int:pk>/', views.api_forum_thread_detail, name='api_forum_thread_detail'),
    path('api/forum/<int:pk>/post/', views.api_add_forum_post, name='api_add_forum_post'),
    path('api/forum/thread/<int:pk>/vote/', views.api_vote_thread, name='api_vote_thread'),
    path('api/forum/thread/<int:pk>/delete/', views.api_delete_forum_thread, name='api_delete_forum_thread'),
    path('api/forum/post/<int:pk>/delete/', views.api_delete_forum_post, name='api_delete_forum_post'),
]

# Pro zobrazení obrázků (avatarů) na lokálním serveru
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)