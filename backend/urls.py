from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from news import views
from news.views import (
    index,
    signup,
    profile_view,
    edit_profile,
    news_detail,
    delete_comment,
    edit_comment,
    # === НАШИ НОВЫЕ ИМПОРТЫ ДЛЯ API ===
    api_news_list,
    api_profile,
    api_login,
    api_signup,
    api_toggle_save,
    api_news_detail,
    api_add_comment,
    api_forum_threads,
    api_create_thread,
    api_forum_thread_detail,
    api_add_forum_post,
    api_add_points
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', index, name='index'),
    path('signup/', signup, name='signup'),
    path('accounts/', include('django.contrib.auth.urls')),
    path('profile/', profile_view, name='profile'),
    path('profile/edit/', edit_profile, name='edit_profile'),
    path('news/<int:pk>/', news_detail, name='news_detail'),
    path('comment/delete/<int:pk>/', delete_comment, name='delete_comment'),
    path('comment/edit/<int:pk>/', edit_comment, name='edit_comment'),
    path('api/login/', api_login, name='api_login'),
    path('api/signup/', api_signup, name='api_signup'),
    path('api/toggle-save/', api_toggle_save, name='api_toggle_save'),
    path('api/news/<int:pk>/', api_news_detail, name='api_news_detail'),
    path('api/news/<int:pk>/comment/', api_add_comment, name='api_add_comment'),
    path('api/forum/', api_forum_threads, name='api_forum_threads'),
    path('api/forum/create/', api_create_thread, name='api_create_thread'),
    path('api/forum/<int:pk>/', api_forum_thread_detail, name='api_forum_thread_detail'),
    path('api/forum/<int:pk>/post/', api_add_forum_post, name='api_add_forum_post'),
    path('api/logout/', views.api_logout, name='api_logout'),
    path('api/comment/<int:pk>/delete/', views.api_delete_comment, name='api_delete_comment'),
    path('api/forum/thread/<int:pk>/delete/', views.api_delete_forum_thread, name='api_delete_forum_thread'),
    path('api/forum/post/<int:pk>/delete/', views.api_delete_forum_post, name='api_delete_forum_post'),

    # === НАШИ НОВЫЕ API МАРШРУТЫ ДЛЯ REACT ===
    # По этим адресам React будет забирать и отправлять JSON данные
    path('api/news/', api_news_list, name='api_news_list'),
    path('api/profile/', api_profile, name='api_profile'),
    path('api/add-points/', api_add_points, name='api_add_points'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)