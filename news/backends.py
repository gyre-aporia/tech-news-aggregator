from django.contrib.auth.backends import BaseBackend
from django.contrib.auth import get_user_model
from django.db.models import Q

User = get_user_model()

class EmailBackend(BaseBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        # Используем filter().first(), чтобы не падать на дубликатах
        user = User.objects.filter(Q(username=username) | Q(email=username)).first()
        
        # ИСПРАВЛЕНО: Сначала проверяем, что user существует (не None), 
        # и только потом проверяем пароль!
        if user and user.check_password(password):
            return user
        
        return None

    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None