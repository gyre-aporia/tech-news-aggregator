from django.shortcuts import render, redirect, get_object_or_404
from .models import News, Category, Profile, Comment
from django.contrib.auth import login  # Funkce pro přihlášení uživatele
from .forms import MyCustomSignupForm, ProfileForm, UserUpdateForm, CommentForm
from django.contrib.auth.decorators import login_required  # pustí jen přihlášené uživatele
from django.core.paginator import Paginator  # Nástroj pro rozdělení dlouhého seznamu na stránky
from django.db.models import Q  # Umožňuje složitější dotazy do databáze (např. logické NEBO)
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from .serializers import NewsSerializer, ProfileSerializer
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.contrib.auth.models import User
from django.http import JsonResponse
import json

def index(request):

    filter_category = request.GET.get('category')
    search_query = request.GET.get('q')


    news_list = News.objects.all().order_by('-id')

    if search_query:
        # Hledáme text buď v titulku (title) NEBO (|) v popisu (description). icontains ignoruje velikost písmen.
        news_list = news_list.filter(
            Q(title__icontains=search_query) |
            Q(description__icontains=search_query)
        )

    if filter_category:
        news_list = news_list.filter(category__name=filter_category)

    paginator = Paginator(news_list, 20)
    page_number = request.GET.get('page')  # Zjistíme, na jaké stránce uživatel zrovna je (z URL adrsy ?page=2)
    page_obj = paginator.get_page(page_number)  # Vybereme jen těch 20 zpráv pro danou stránku

    categories = Category.objects.all()

    context = {
        'news_list': page_obj,
        'categories': categories,
        'selected_category': filter_category,
        'search_query': search_query,
    }
    return render(request, 'news/index.html', context)


def signup(request):
    if request.method == 'POST':
        form = MyCustomSignupForm(request.POST)
        if form.is_valid():
            user = form.save()
            user.backend = 'django.contrib.auth.backends.ModelBackend'  # Technická nutnost pro Django login
            login(request, user)  # Automaticky uživatele po registraci přihlásíme, dáváme cookies/session
            return redirect('/')
    else:
        form = MyCustomSignupForm()
    return render(request, 'registration/signup.html', {'form': form})


@login_required  # Sem může jen přihlášený uživatel
def profile_view(request):
    # Najde profil uživatele, nebo ho vytvoří, pokud ještě neexistuje
    profile, created = Profile.objects.get_or_create(user=request.user)
    return render(request, 'news/profile.html', {'profile': profile})


@login_required
def edit_profile(request):
    if request.method == 'POST':
        # instance= říká: "Nevytvářej nového uživatele, ale uprav tohoto existujícího"
        u_form = UserUpdateForm(request.POST, instance=request.user)
        # request.FILES je nutné pro nahrávání obrázků (avatar)
        p_form = ProfileForm(request.POST, request.FILES, instance=request.user.profile)

        if u_form.is_valid() and p_form.is_valid():
            u_form.save()
            p_form.save()
            return redirect('profile')
    else:
        # Naplníme formuláře starými daty uživatele, aby viděl, co upravuje
        u_form = UserUpdateForm(instance=request.user)
        p_form = ProfileForm(instance=request.user.profile)

    context = {
        'u_form': u_form,
        'p_form': p_form,
    }
    return render(request, 'news/profile_edit.html', context)


def news_detail(request, pk):
    # pk (Primary Key)
    news = News.objects.get(pk=pk)

    comments = news.comments.all()

    if request.method == 'POST':
        if request.user.is_authenticated:
            comment_form = CommentForm(data=request.POST)
            if comment_form.is_valid():
                # commit=False: Vytvoří komentář v paměti, ale zatím ho neukládá do databáze
                new_comment = comment_form.save(commit=False)
                new_comment.post = news  # ke které zprávě komentář patří
                new_comment.author = request.user  # autor komentáře
                new_comment.save()
                return redirect('news_detail', pk)  # Obnovíme stránku (zabrání to dvojitému odeslání při F5)
        else:
            return redirect('login')  # Pokud nepřihlášený zkusí poslat komentář
    else:
        comment_form = CommentForm()  # Prázdný formulář pro čtenáře

    return render(request, 'news/news_detail.html', {
        'news': news,
        'comments': comments,
        'comment_form': comment_form,
    })


@login_required
def delete_comment(request, pk):
    comment = get_object_or_404(Comment, pk=pk)

    # Ochrana: Smazat komentář může jen jeho autor
    if request.user == comment.author:
        news_id = comment.post.id  # Než komentář smažeme, zapamatujeme si ID článku, u kterého byl
        comment.delete()
        return redirect('news_detail', pk=news_id)
    else:
        return redirect('news_detail', pk=comment.post.id)


@login_required
def edit_comment(request, pk):
    comment = get_object_or_404(Comment, pk=pk)

    # Ochrana: Pokud uživatel NENÍ autorem, vyhodíme ho pryč
    if request.user != comment.author:
        return redirect('news_detail', pk=comment.post.id)

    if request.method == 'POST':
        form = CommentForm(request.POST, instance=comment)
        if form.is_valid():
            form.save()
            return redirect('news_detail', pk=comment.post.id)
    else:
        # Vykreslíme formulář naplněný původním textem komentáře
        form = CommentForm(instance=comment)

    return render(request, 'news/comment_edit.html', {'form': form})


# ==========================================
# ЗОНА API ДЛЯ REACT (ВОЗВРАЩАЮТ JSON)
# ==========================================

# 1. API: Получить список новостей (Пункт 3: Гость может искать и фильтровать)
@api_view(['GET'])
@permission_classes([AllowAny])  # Доступно всем, даже без регистрации
def api_news_list(request):
    news_list = News.objects.all().order_by('-id')

    # Поиск (работает точно так же, как в твоем старом коде)
    search_query = request.GET.get('q')
    if search_query:
        news_list = news_list.filter(Q(title__icontains=search_query) | Q(description__icontains=search_query))

    # Фильтрация по категории
    filter_category = request.GET.get('category')
    if filter_category:
        news_list = news_list.filter(category__name=filter_category)

    # Используем наш сериализатор, чтобы перевести питоновские объекты в JSON
    serializer = NewsSerializer(news_list, many=True)
    return Response(serializer.data)


# 2. API: Получить профиль пользователя (Пункт 4: Личный кабинет)
@csrf_exempt
def api_profile(request):
    # Если пользователь не залогинен, отдаем ошибку
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Musíte se přihlásit'}, status=403)

    # Находим или создаем профиль геймификации
    profile, created = Profile.objects.get_or_create(user=request.user)

    # Считаем, сколько очков нужно для следующего уровня (например, текущий уровень * 50)
    next_level_xp = profile.level * 50
    # Сколько очков внутри текущего уровня уже набрано
    current_level_progress = profile.points % 50 if profile.level > 1 else profile.points

    return JsonResponse({
        'user': {
            'id': request.user.id,
            'username': request.user.username,
            'email': request.user.email or 'Email nezadán',
            'date_joined': request.user.date_joined.strftime('%d.%m.%Y') if request.user.date_joined else 'Neznámo',
        },
        'points': profile.points,
        'level': profile.level,
        'next_level_xp': next_level_xp,
        'current_level_progress': current_level_progress,
        'saved_count': profile.read_later.count(),
        # Если в твоей модели Profile есть поле биография (bio) или аватар, можно раскомментировать строки ниже:
        # 'bio': getattr(profile, 'bio', 'Žádné informace'),
    })


# 3. API: Начислить опыт за чтение статьи (Пункт 5: Геймификация)
# Теперь это чистая функция Django, а не DRF. Она 100% игнорирует CSRF.
@csrf_exempt
def api_add_points(request):
    # Проверяем метод и авторизацию вручную
    if request.method == 'POST':
        if not request.user.is_authenticated:
            return JsonResponse({'error': 'Musíte se přihlásit'}, status=403)

        profile = request.user.profile
        profile.points += 10  # Даем 10 очков

        # Логика уровней
        if profile.points >= (profile.level * 50):
            profile.level += 1

        profile.save()

        # Отдаем ответ через встроенный JsonResponse
        return JsonResponse({
            'message': 'Článek přečten! Získáváš 10 XP.',
            'points': profile.points,
            'level': profile.level
        })

from django.contrib.auth import authenticate, login as django_login

@csrf_exempt  # Отключаем проверку CSRF-токена для этого запроса
@api_view(['POST'])
@permission_classes([AllowAny])
def api_login(request):
    username = request.data.get('username')
    password = request.data.get('password')
    
    user = authenticate(username=username, password=password)
    
    if user is not None:
        django_login(request, user)  # Создаем сессию внутри Django
        return Response({'message': 'Успешный вход!'})
    else:
        return Response({'error': 'Неверные данные'}, status=400)


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def api_signup(request):
    username = request.data.get('username')
    password = request.data.get('password')

    if not username or not password:
        return Response({'error': 'Vyplňte jméno i heslo'}, status=400)

    # Проверяем, не занято ли имя
    if User.objects.filter(username=username).exists():
        return Response({'error': 'Uživatel s tímto jménem už existuje'}, status=400)

    # Создаем нового пользователя
    user = User.objects.create_user(username=username, password=password)

    # Сразу же авторизуем его после регистрации
    django_login(request, user)

    return Response({'message': 'Registrace úspěšná!'})


@csrf_exempt
def api_toggle_save(request):
    if request.method == 'POST':
        # Проверка на авторизацию
        if not request.user.is_authenticated:
            return JsonResponse({'error': 'Musíte se přihlásit'}, status=403)

        try:
            # Читаем данные от React
            data = json.loads(request.body)
            news_id = data.get('news_id')

            # Находим статью и профиль пользователя
            news_item = News.objects.get(id=news_id)
            profile = request.user.profile

            # Логика переключателя (тумблера)
            if news_item in profile.read_later.all():
                profile.read_later.remove(news_item)
                is_saved = False
            else:
                profile.read_later.add(news_item)
                is_saved = True

            return JsonResponse({'is_saved': is_saved})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)


# API для получения ОДНОЙ статьи и её комментариев
# API для получения ОДНОЙ статьи и её комментариев
@csrf_exempt
def api_news_detail(request, pk):
    try:
        # Сначала проверяем, существует ли вообще статья
        news = News.objects.get(pk=pk)
    except News.DoesNotExist:
        return JsonResponse({'error': 'Článek nenalezen'}, status=404)

    try:
        # Собираем комментарии к этой статье
        comments_list = []
        for c in news.comments.all():
            comments_list.append({
                'id': c.id,
                'author': c.author.username,
                # Безопасное получение уровня (на случай если профиля вдруг нет)
                'author_level': c.author.profile.level if hasattr(c.author, 'profile') else 1,

                # БЕЗОПАСНОЕ ПОЛУЧЕНИЕ ТЕКСТА:
                # Python сам проверит, как называется твое поле: 'body' или 'text'
                'text': getattr(c, 'body', getattr(c, 'text', '')),
            })

        return JsonResponse({
            'id': news.id,
            'title': news.title,
            'description': news.description,
            'image_url': news.image_url,
            'link': news.link,
            'source': news.source,
            'category_name': news.category.name if getattr(news, 'category', None) else '',
            'comments': comments_list
        })
    except Exception as e:
        # Если код падает, мы выведем реальную ошибку в терминал PyCharm красным цветом!
        print(f"!!! ОШИБКА В api_news_detail: {e}")
        return JsonResponse({'error': str(e)}, status=500)


# API для добавления нового комментария
@csrf_exempt
def api_add_comment(request, pk):
    if request.method == 'POST':
        if not request.user.is_authenticated:
            return JsonResponse({'error': 'Musíte se přihlásit'}, status=403)

        try:
            data = json.loads(request.body)
            text = data.get('text')

            news = News.objects.get(pk=pk)

            # Создаем комментарий в базе
            # ВНИМАНИЕ: Если поле текста называется 'body', замени text=text на body=text
            comment = Comment.objects.create(
                post=news,
                author=request.user,
                body=text
            )

            return JsonResponse({'message': 'Komentář přidán!'})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)