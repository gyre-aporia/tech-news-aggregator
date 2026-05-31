from django.shortcuts import render, redirect, get_object_or_404
from .models import News, Category, Profile, Comment, ForumThread, ForumPost
from django.contrib.auth import login  # Funkce pro přihlášení uživatele
from .forms import MyCustomSignupForm, ProfileForm, UserUpdateForm, CommentForm
from django.contrib.auth.decorators import login_required  # pustí jen přihlášené uživatele
from django.core.paginator import Paginator  # Nástroj pro rozdělení dlouhého seznamu na stránky
from django.db.models import Q  # Umožňuje složitější dotazy do databáze (např. logické NEBO)
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from .serializers import NewsSerializer, ProfileSerializer
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.contrib.auth.models import User
from django.http import JsonResponse
import json
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from django.contrib.auth import logout as django_logout

# Добавь эту функцию к остальным (api_login, api_signup)
@csrf_exempt
def api_logout(request):
    if request.method == 'POST':
        django_logout(request) # Джанго сам уничтожит сессию
        return JsonResponse({'message': 'Úspěšně odhlášeno'})
    return JsonResponse({'error': 'Pouze POST'}, status=405)

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
def parse_advanced_search(query_string):
    """
    Разбирает строку поиска с операторами AND и NOT.
    Пример: "Apple AND iPhone NOT Macbook"
    """
    # 1. Сначала отделяем исключения (то, что идет после NOT)
    # Строка разобьется на части. Первая часть — то что ищем, остальные — то, что исключаем.
    parts = query_string.split(' NOT ')
    positive_side = parts[0]
    negative_keywords = parts[1:] if len(parts) > 1 else []

    # 2. Разбираем то, что нужно найти, по оператору AND
    positive_keywords = positive_side.split(' AND ')

    # Создаем пустой базовый объект запроса Django Q
    q_object = Q()

    # 3. Добавляем условия И (AND): КАЖДОЕ слово должно быть в титле или описании
    for word in positive_keywords:
        word = word.strip()
        if word:
            # Логика &= означает, что это условие обязательно должно выполняться (AND)
            q_object &= (Q(title__icontains=word) | Q(description__icontains=word))

    # 4. Добавляем условия НЕ (NOT): НИ ОДНОГО из этих слов не должно быть в статье
    for word in negative_keywords:
        word = word.strip()
        if word:
            # Оператор ~ означает логическое "НЕ" (NOT)
            q_object &= ~(Q(title__icontains=word) | Q(description__icontains=word))

    return q_object


# 1. API: Получить список новостей (Пункт 3: Гость может искать и фильтровать)
@api_view(['GET'])
@permission_classes([AllowAny])
def api_news_list(request):
    news_list = News.objects.all().order_by('-id')
    
    search_query = request.GET.get('q')
    if search_query:
        # ПРИМЕНЯЕМ НАШУ ПРОДВИНУТУЮ ЛОГИКУ ПОИСКА (Пункт 10)
        advanced_filters = parse_advanced_search(search_query)
        news_list = news_list.filter(advanced_filters)
        
    filter_category = request.GET.get('category')
    if filter_category:
        news_list = news_list.filter(category__name=filter_category)

    serializer = NewsSerializer(news_list, many=True)
    return Response(serializer.data)

class UnsafeSessionAuthentication(SessionAuthentication):
    def enforce_csrf(self, request):
        return
    
# 2. API: Получить профиль пользователя (Пункт 4: Личный кабинет)
@csrf_exempt
@api_view(['GET', 'POST']) # Убедись, что тут декоратор от DRF
@authentication_classes([UnsafeSessionAuthentication]) # Используем наш кастомный класс без CSRF
@permission_classes([AllowAny])
def api_profile(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Musíte se přihlásit'}, status=403)
        
    profile = Profile.objects.filter(user=request.user).first() 
    if not profile:
        profile = Profile.objects.create(user=request.user)

    # ЕСЛИ ПОЛЬЗОВАТЕЛЬ ИЗМЕНЯЕТ ДАННЫЕ (POST)
    if request.method == 'POST':
        try:
            # При работе с файлами данные приходят из request.POST, а не из json
            username = request.POST.get('username')
            email = request.POST.get('email')
            bio = request.POST.get('bio', '')
            birth_date = request.POST.get('birthDate', '')
            
            # Обновляем данные пользователя (User)
            if username:
                request.user.username = username
            if email is not None:
                request.user.email = email
            request.user.save()
            
            # Обновляем данные профиля (Profile)
            profile.bio = bio
            if birth_date:
                profile.birth_date = birth_date
            else:
                profile.birth_date = None
                
            # Проверяем, пришел ли файл аватарки
            if 'avatar' in request.FILES:
                profile.avatar = request.FILES['avatar']
                
            # Проверяем, нажал ли пользователь чекбокс "Zrušit" (очистить аватар)
            elif request.POST.get('clear_avatar') == 'true':
                if profile.avatar:
                    profile.avatar.delete(save=False) # удаляем физический файл
                profile.avatar = None

            profile.save()
            return JsonResponse({'message': 'Profil byl úspěšně upraven!'})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
            
    # ОБЫЧНЫЙ GET ЗАПРОС (ПРОСМОТР ПРОФИЛЯ)
    next_level_xp = profile.level * 50
    current_level_progress = profile.points % 50 if profile.level > 1 else profile.points
    
    # Безопасно формируем ссылку на аватарку
    avatar_url = None
    if profile.avatar:
        avatar_url = request.build_absolute_uri(profile.avatar.url)

    return JsonResponse({
        'user': {
            'id': request.user.id,
            'username': request.user.username,
            'email': request.user.email or '',
            'date_joined': request.user.date_joined.strftime('%d.%m.%Y') if request.user.date_joined else 'Neznámo',
        },
        'avatar_url': avatar_url,
        'points': profile.points,
        'level': profile.level,
        'next_level_xp': next_level_xp,
        'current_level_progress': current_level_progress,
        'saved_count': profile.read_later.count(),
        'bio': profile.bio or '',
        'read_history': list(profile.read_history.values_list('id', flat=True)),
        'birth_date': profile.birth_date.strftime('%Y-%m-%d') if getattr(profile, 'birth_date', None) else ''
    })


# 3. API: Начислить опыт за чтение статьи (Пункт 5: Геймификация)
# Теперь это чистая функция Django, а не DRF. Она 100% игнорирует CSRF.
@csrf_exempt
def api_add_points(request):
    if request.method == 'POST':
        if not request.user.is_authenticated:
            return JsonResponse({'error': 'Musíte se přihlásit'}, status=403)

        try:
            data = json.loads(request.body)
            news_id = data.get('news_id')
            news_item = News.objects.get(id=news_id)
            profile = request.user.profile

            # Проверяем, читал ли он её уже
            if news_item in profile.read_history.all():
                return JsonResponse({'message': 'Уже прочитано', 'points': profile.points, 'level': profile.level})

            # Если не читал: добавляем в историю и даем очки
            profile.read_history.add(news_item)
            profile.points += 10 
            
            if profile.points >= (profile.level * 50):
                profile.level += 1
            profile.save()

            return JsonResponse({'message': 'Článek přečten! Získáváš 10 XP.', 'points': profile.points, 'level': profile.level})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

from django.contrib.auth import authenticate, login as django_login

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def api_login(request):
    username = request.data.get('username')
    password = request.data.get('password')
    
    user = authenticate(username=username, password=password)
    
    if user is not None:
        # ИСПРАВЛЕНО: Тоже явно указываем бэкенд для создания сессии
        django_login(request, user, backend='news.backends.EmailBackend')
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

    if User.objects.filter(username=username).exists():
        return Response({'error': 'Uživatel s tímto jménem už existuje'}, status=400)

    user = User.objects.create_user(username=username, password=password)

    # ИСПРАВЛЕНО: Добавляем явное указание твоего кастомного бэкенда авторизации
    django_login(request, user, backend='news.backends.EmailBackend')

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
            # Достаем ссылку на аватарку автора комментария
            avatar_url = None
            if hasattr(c.author, 'profile') and c.author.profile.avatar:
                avatar_url = request.build_absolute_uri(c.author.profile.avatar.url)

            comments_list.append({
                'id': c.id,
                'author': c.author.username,
                'author_level': c.author.profile.level if hasattr(c.author, 'profile') else 1,
                'author_avatar': avatar_url,  # <--- НОВОЕ ПОЛЕ
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
        
# ==========================================
# API ДЛЯ ФОРУМА (Пункт 6)
# ==========================================

# ИСПРАВЛЕННЫЙ ВАРИАНТ: Поиск по темам и сообщениям форума
@csrf_exempt
def api_forum_threads(request):
    search_query = request.GET.get('q')  # Получаем поисковый запрос из React
    threads = ForumThread.objects.all().order_by('-created_at')
    
    if search_query:
        # Умный фильтр: ищем совпадения в названии темы ИЛИ в теле сообщений (posts__body)
        threads = threads.filter(
            Q(title__icontains=search_query) |
            Q(posts__body__icontains=search_query)
        ).distinct()  # distinct() нужен, чтобы темы не дублировались, если совпало несколько постов

    data = []
    for t in threads:
        data.append({
            'id': t.id,
            'title': t.title,
            'author': t.author.username,
            'created_at': t.created_at.strftime('%d.%m.%Y %H:%M'),
            'post_count': t.posts.count()
        })
    return JsonResponse(data, safe=False)
@csrf_exempt
def api_create_thread(request):
    if request.method == 'POST':
        if not request.user.is_authenticated:
            return JsonResponse({'error': 'Musíte se přihlásit'}, status=403)
        try:
            data = json.loads(request.body)
            title = data.get('title')
            if not title:
                return JsonResponse({'error': 'Název nesmí být prázdný'}, status=400)
                
            thread = ForumThread.objects.create(title=title, author=request.user)
            return JsonResponse({'id': thread.id, 'message': 'Vlákno vytvořeno!'})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

# 3. Получить детали одной темы и все сообщения в ней
@csrf_exempt
def api_forum_thread_detail(request, pk):
    try:
        thread = ForumThread.objects.get(pk=pk)
        posts = []
        for p in thread.posts.all().order_by('created_at'):
            # Достаем ссылку на аватарку автора поста
            avatar_url = None
            if hasattr(p.author, 'profile') and p.author.profile.avatar:
                avatar_url = request.build_absolute_uri(p.author.profile.avatar.url)

            posts.append({
                'id': p.id,
                'author': p.author.username,
                'author_level': p.author.profile.level if hasattr(p.author, 'profile') else 1,
                'author_avatar': avatar_url,  # <--- НОВОЕ ПОЛЕ
                'body': p.body,
                'created_at': p.created_at.strftime('%d.%m.%Y %H:%M')
            })
            
        return JsonResponse({
            'id': thread.id,
            'title': thread.title,
            'author': thread.author.username,
            'created_at': thread.created_at.strftime('%d.%m.%Y %H:%M'),
            'posts': posts
        })
    except ForumThread.DoesNotExist:
        return JsonResponse({'error': 'Vlákno nenalezeno'}, status=404)

# 4. Добавить сообщение (ответ) в тему
@csrf_exempt
def api_add_forum_post(request, pk):
    if request.method == 'POST':
        if not request.user.is_authenticated:
            return JsonResponse({'error': 'Musíte se přihlásit'}, status=403)
        try:
            data = json.loads(request.body)
            body = data.get('body')
            thread = ForumThread.objects.get(pk=pk)
            
            ForumPost.objects.create(thread=thread, author=request.user, body=body)
            return JsonResponse({'message': 'Příspěvek přidán!'})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
        

# ==========================================
# API ДЛЯ УДАЛЕНИЯ КОНТЕНТА
# ==========================================
@csrf_exempt
def api_delete_comment(request, pk):
    if request.method == 'DELETE':
        if not request.user.is_authenticated:
            return JsonResponse({'error': 'Musíte se přihlásit'}, status=403)
        try:
            comment = Comment.objects.get(pk=pk)
            if comment.author == request.user:
                comment.delete()
                return JsonResponse({'message': 'Komentář byl smazán'})
            return JsonResponse({'error': 'Nemáte oprávnění ke smazání'}, status=403)
        except Comment.DoesNotExist:
            return JsonResponse({'error': 'Nenalezeno'}, status=404)

@csrf_exempt
def api_delete_forum_thread(request, pk):
    if request.method == 'DELETE':
        if not request.user.is_authenticated:
            return JsonResponse({'error': 'Musíte se přihlásit'}, status=403)
        try:
            thread = ForumThread.objects.get(pk=pk)
            if thread.author == request.user:
                thread.delete()
                return JsonResponse({'message': 'Vlákno bylo smazáno'})
            return JsonResponse({'error': 'Nemáte oprávnění ke smazání'}, status=403)
        except ForumThread.DoesNotExist:
            return JsonResponse({'error': 'Nenalezeno'}, status=404)

@csrf_exempt
def api_delete_forum_post(request, pk):
    if request.method == 'DELETE':
        if not request.user.is_authenticated:
            return JsonResponse({'error': 'Musíte se přihlásit'}, status=403)
        try:
            post = ForumPost.objects.get(pk=pk)
            if post.author == request.user:
                post.delete()
                return JsonResponse({'message': 'Příspěvek byl smazán'})
            return JsonResponse({'error': 'Nemáte oprávnění ke smazání'}, status=403)
        except ForumPost.DoesNotExist:
            return JsonResponse({'error': 'Nenalezeno'}, status=404)