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
    edit_comment
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
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)