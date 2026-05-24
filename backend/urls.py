from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
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

    # === НАШИ НОВЫЕ API МАРШРУТЫ ДЛЯ REACT ===
    # По этим адресам React будет забирать и отправлять JSON данные
    path('api/news/', api_news_list, name='api_news_list'),
    path('api/profile/', api_profile, name='api_profile'),
    path('api/add-points/', api_add_points, name='api_add_points'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)