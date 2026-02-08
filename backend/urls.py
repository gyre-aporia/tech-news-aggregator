from django.contrib import admin
from django.urls import path
from news.views import run_parser, index
from news import views
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', index),             # Главная страница (Показ новостей)
    path('parse/', run_parser),  # Ссылка для запуска парсера
    path('signup/', views.signup, name='signup'),
    path('accounts/', include('django.contrib.auth.urls')),
]