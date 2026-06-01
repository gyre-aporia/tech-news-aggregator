import os
from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# ==========================================
# BEZPEČNOSTNÍ NASTAVENÍ (PRODUKCE vs. VÝVOJ)
# ==========================================
# V produkci se SECRET_KEY a DEBUG nenačítají z kódu, ale ze systémových proměnných
SECRET_KEY = os.environ.get(
    'DJANGO_SECRET_KEY', 
    'django-insecure-_q2474sv24x2o)qcu%_bnu&hgp=0u*9qn%95y-6fz$nm*gpv%t'
)

# Pokud v systému není proměnná DJANGO_DEBUG rovna 'False', jedeme ve vývojovém režimu
DEBUG = os.environ.get('DJANGO_DEBUG', 'True') != 'False'

ALLOWED_HOSTS = ['localhost', '127.0.0.1']

# ==========================================
# APLIKACE A MIDDLEWARE
# ==========================================
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Knihovny třetích stran
    'rest_framework',
    'corsheaders',

    # Vlastní aplikace
    'news',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware', # Musí být vysoko pro správné fungování API
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend.wsgi.application'

# ==========================================
# DATABÁZE
# ==========================================
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# ==========================================
# AUTENTIZACE A HESLA
# ==========================================
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Vlastní ověřovací backend (umožňuje přihlášení pomocí e-mailu)
AUTHENTICATION_BACKENDS = [
    'news.backends.EmailBackend',
    'django.contrib.auth.backends.ModelBackend',
]

# ==========================================
# LOKALIZACE (Jazyk a čas)
# ==========================================
LANGUAGE_CODE = 'cs'
TIME_ZONE = 'Europe/Prague'
USE_I18N = True
USE_TZ = True

# ==========================================
# STATICKÉ A MEDIÁLNÍ SOUBORY
# ==========================================
STATIC_URL = 'static/'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# ==========================================
# CORS A API NASTAVENÍ (Propojení s Reactem)
# ==========================================
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
CORS_ALLOW_CREDENTIALS = True

# Nastavení cookies pro lokální vývoj (React + Django na stejném PC)
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_SECURE = False 

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny', 
    ],
}