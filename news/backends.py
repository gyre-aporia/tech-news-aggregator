from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model
from django.db.models import Q

User = get_user_model()

class EmailBackend(ModelBackend):
    """
    Vlastní autentizační backend, který umožňuje uživatelům 
    přihlásit se buď pomocí uživatelského jména, nebo e-mailu.
    """
    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None:
            username = kwargs.get(User.USERNAME_FIELD)
            
        try:
            # Hledáme uživatele podle jména NEBO e-mailu
            user = User.objects.filter(
                Q(username__iexact=username) | Q(email__iexact=username)
            ).distinct().first()
            
            if user and user.check_password(password) and self.user_can_authenticate(user):
                return user
                
        except Exception:
            return None
            
        return None