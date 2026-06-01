import json
from django.db.models import Q
from django.contrib.auth import authenticate, login as django_login, logout as django_logout
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response

from .models import News, Category, Profile, Comment, ForumThread, ForumPost
from .serializers import NewsSerializer

# ==========================================
# POMOCNÉ FUNKCE (VŠEOBECNÉ)
# ==========================================

def parse_advanced_search(query_string):
    """
    Rozebere vyhledávací dotaz s operátory AND a NOT. (Bod 10)
    Příklad: "Apple AND iPhone NOT Macbook"
    """
    parts = query_string.split(' NOT ')
    positive_side = parts[0]
    negative_keywords = parts[1:] if len(parts) > 1 else []

    positive_keywords = positive_side.split(' AND ')
    q_object = Q()

    # Přidáme podmínky A ZÁROVEŇ (AND)
    for word in positive_keywords:
        word = word.strip()
        if word:
            q_object &= (Q(title__icontains=word) | Q(description__icontains=word))

    # Přidáme podmínky NE (NOT)
    for word in negative_keywords:
        word = word.strip()
        if word:
            q_object &= ~(Q(title__icontains=word) | Q(description__icontains=word))

    return q_object


class UnsafeSessionAuthentication(SessionAuthentication):
    """Vypne CSRF kontrolu pro specifické API endpointy (užitečné pro React)"""
    def enforce_csrf(self, request):
        return


# ==========================================
# AUTENTIZACE A UŽIVATEL (LOGIN / SIGNUP / PROFILE)
# ==========================================

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def api_login(request):
    username = request.data.get('username')
    password = request.data.get('password')
    
    user = authenticate(username=username, password=password)
    
    if user is not None:
        django_login(request, user, backend='news.backends.EmailBackend')
        return Response({'message': 'Úspěšně přihlášeno!'})
    return Response({'error': 'Nesprávné údaje'}, status=400)


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
    django_login(request, user, backend='news.backends.EmailBackend')

    return Response({'message': 'Registrace úspěšná!'})


@csrf_exempt
def api_logout(request):
    if request.method == 'POST':
        django_logout(request)
        return JsonResponse({'message': 'Úspěšně odhlášeno'})
    return JsonResponse({'error': 'Pouze POST metody'}, status=405)


@csrf_exempt
@api_view(['GET', 'POST'])
@authentication_classes([UnsafeSessionAuthentication])
@permission_classes([AllowAny])
def api_profile(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Musíte se přihlásit'}, status=403)
        
    profile, created = Profile.objects.get_or_create(user=request.user)

    if request.method == 'POST':
        try:
            # Uložení základních dat uživatele
            if username := request.POST.get('username'):
                request.user.username = username
            if email := request.POST.get('email'):
                request.user.email = email
            request.user.save()
            
            # Uložení dat profilu
            profile.bio = request.POST.get('bio', '')
            profile.birth_date = request.POST.get('birthDate') or None
                
            # Zpracování avataru
            if 'avatar' in request.FILES:
                profile.avatar = request.FILES['avatar']
            elif request.POST.get('clear_avatar') == 'true':
                if profile.avatar:
                    profile.avatar.delete(save=False)
                profile.avatar = None

            profile.save()

            # Zpracování preferovaných kategorií
            categories_names = request.POST.getlist('preferred_categories')
            cats_to_save = Category.objects.filter(name__in=categories_names)
            profile.preferred_categories.set(cats_to_save)

            return JsonResponse({'message': 'Profil byl úspěšně upraven!'})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
            
    # GET request - vrácení dat profilu
    next_level_xp = profile.level * 50
    current_level_progress = profile.points % 50 if profile.level > 1 else profile.points
    avatar_url = request.build_absolute_uri(profile.avatar.url) if profile.avatar else None

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
        'birth_date': profile.birth_date.strftime('%Y-%m-%d') if getattr(profile, 'birth_date', None) else '',
        'preferred_categories': [{'name': c.name} for c in profile.preferred_categories.all()]
    })


# ==========================================
# ZPRÁVY A ČLÁNKY (NEWS API)
# ==========================================

@api_view(['GET'])
@permission_classes([AllowAny])
def api_news_list(request):
    news_list = News.objects.select_related('category').all().order_by('-id')
    
    if search_query := request.GET.get('q'):
        news_list = news_list.filter(parse_advanced_search(search_query))
        
    if filter_category := request.GET.get('category'):
        news_list = news_list.filter(category__name=filter_category)

    serializer = NewsSerializer(news_list, many=True)
    return Response(serializer.data)


@csrf_exempt
def api_news_detail(request, pk):
    try:
        news = News.objects.select_related('category').get(pk=pk)
    except News.DoesNotExist:
        return JsonResponse({'error': 'Článek nenalezen'}, status=404)

    try:
        # Optimalizace: select_related načte autory a jejich profily jedním SQL dotazem (zamezení N+1 problému)
        comments_query = news.comments.select_related('author__profile').all()
        comments_list = []
        
        for c in comments_query:
            avatar_url = request.build_absolute_uri(c.author.profile.avatar.url) if hasattr(c.author, 'profile') and c.author.profile.avatar else None

            comments_list.append({
                'id': c.id,
                'author': c.author.username,
                'author_level': c.author.profile.level if hasattr(c.author, 'profile') else 1,
                'author_avatar': avatar_url,
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
        print(f"!!! CHYBA V api_news_detail: {e}")
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
def api_add_comment(request, pk):
    if request.method != 'POST': return JsonResponse({'error': 'Bad method'}, status=405)
    if not request.user.is_authenticated: return JsonResponse({'error': 'Musíte se přihlásit'}, status=403)

    try:
        data = json.loads(request.body)
        news = News.objects.get(pk=pk)
        Comment.objects.create(post=news, author=request.user, body=data.get('text', ''))
        return JsonResponse({'message': 'Komentář přidán!'})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
def api_add_points(request):
    """Přidá body/XP uživateli po přečtení článku (Bod 5)"""
    if request.method != 'POST': return JsonResponse({'error': 'Bad method'}, status=405)
    if not request.user.is_authenticated: return JsonResponse({'error': 'Musíte se přihlásit'}, status=403)

    try:
        data = json.loads(request.body)
        news_item = News.objects.get(id=data.get('news_id'))
        profile = request.user.profile

        if news_item in profile.read_history.all():
            return JsonResponse({'message': 'Již přečteno', 'points': profile.points, 'level': profile.level})

        profile.read_history.add(news_item)
        profile.points += 10 
        
        if profile.points >= (profile.level * 50):
            profile.level += 1
        profile.save()

        return JsonResponse({'message': 'Článek přečten! Získáváš 10 XP.', 'points': profile.points, 'level': profile.level})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
def api_toggle_save(request):
    """Uložení článku k pozdějšímu přečtení (Přečíst později - Bod 4)"""
    if request.method != 'POST': return JsonResponse({'error': 'Bad method'}, status=405)
    if not request.user.is_authenticated: return JsonResponse({'error': 'Musíte se přihlásit'}, status=403)

    try:
        data = json.loads(request.body)
        news_item = News.objects.get(id=data.get('news_id'))
        profile = request.user.profile

        if news_item in profile.read_later.all():
            profile.read_later.remove(news_item)
            is_saved = False
        else:
            profile.read_later.add(news_item)
            is_saved = True

        return JsonResponse({'is_saved': is_saved})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


# ==========================================
# KOMUNITNÍ FÓRUM API (Bod 6)
# ==========================================

@csrf_exempt
def api_forum_threads(request):
    try:
        # Optimalizace: prefetch_related pro efektivní počítání upvotes/downvotes a příspěvků
        threads = ForumThread.objects.select_related('author').prefetch_related('posts', 'upvotes', 'downvotes').all().order_by('-created_at')
        
        if search_query := request.GET.get('q'):
            threads = threads.filter(
                Q(title__icontains=search_query) | Q(posts__body__icontains=search_query)
            ).distinct()

        data = [{
            'id': t.id,
            'title': t.title,
            'category': t.category,
            'author': t.author.username,
            'created_at': t.created_at.strftime('%d.%m.%Y %H:%M'),
            'post_count': t.posts.count(),
            'upvotes': t.upvotes.count(),
            'downvotes': t.downvotes.count(),
            'has_upvoted': request.user in t.upvotes.all() if request.user.is_authenticated else False,  
            'has_downvoted': request.user in t.downvotes.all() if request.user.is_authenticated else False,
        } for t in threads]
        
        return JsonResponse(data, safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
def api_create_thread(request):
    if request.method != 'POST': return JsonResponse({'error': 'Bad method'}, status=405)
    if not request.user.is_authenticated: return JsonResponse({'error': 'Musíte se přihlásit'}, status=403)
    
    try:
        data = json.loads(request.body)
        title = data.get('title')
        if not title: return JsonResponse({'error': 'Název nesmí být prázdný'}, status=400)
            
        thread = ForumThread.objects.create(
            title=title, 
            author=request.user, 
            category=data.get('category', 'Ostatní'), 
            description=data.get('description', '')
        )
        return JsonResponse({'id': thread.id, 'message': 'Vlákno vytvořeno!'})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
def api_forum_thread_detail(request, pk):
    try:
        thread = ForumThread.objects.select_related('author').get(pk=pk)
        # Optimalizace načtení příspěvků a profilů autorů
        posts_query = thread.posts.select_related('author__profile').all().order_by('created_at')
        
        posts = []
        for p in posts_query:
            avatar_url = request.build_absolute_uri(p.author.profile.avatar.url) if hasattr(p.author, 'profile') and p.author.profile.avatar else None
            posts.append({
                'id': p.id,
                'author': p.author.username,
                'author_level': p.author.profile.level if hasattr(p.author, 'profile') else 1,
                'author_avatar': avatar_url,
                'body': p.body,
                'created_at': p.created_at.strftime('%d.%m.%Y %H:%M')
            })
            
        return JsonResponse({
            'id': thread.id,
            'title': thread.title,
            'description': thread.description,
            'author': thread.author.username,
            'created_at': thread.created_at.strftime('%d.%m.%Y %H:%M'),
            'posts': posts
        })
    except ForumThread.DoesNotExist:
        return JsonResponse({'error': 'Vlákno nenalezeno'}, status=404)


@csrf_exempt
def api_add_forum_post(request, pk):
    if request.method != 'POST': return JsonResponse({'error': 'Bad method'}, status=405)
    if not request.user.is_authenticated: return JsonResponse({'error': 'Musíte se přihlásit'}, status=403)
    
    try:
        data = json.loads(request.body)
        thread = ForumThread.objects.get(pk=pk)
        ForumPost.objects.create(thread=thread, author=request.user, body=data.get('body', ''))
        return JsonResponse({'message': 'Příspěvek přidán!'})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
def api_vote_thread(request, pk):
    if request.method != 'POST': return JsonResponse({'error': 'Bad method'}, status=405)
    if not request.user.is_authenticated: return JsonResponse({'error': 'Musíte se přihlásit'}, status=403)
    
    try:
        data = json.loads(request.body)
        vote_type = data.get('vote_type')
        thread = ForumThread.objects.get(pk=pk)

        if vote_type == 'up':
            if request.user in thread.upvotes.all():
                thread.upvotes.remove(request.user)
            else:
                thread.upvotes.add(request.user)
                thread.downvotes.remove(request.user)
        elif vote_type == 'down':
            if request.user in thread.downvotes.all():
                thread.downvotes.remove(request.user)
            else:
                thread.downvotes.add(request.user)
                thread.upvotes.remove(request.user)
        
        return JsonResponse({
            'upvotes': thread.upvotes.count(),
            'downvotes': thread.downvotes.count()
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


# ==========================================
# MAZÁNÍ OBSAHU (DELETE API)
# ==========================================

@csrf_exempt
def api_delete_comment(request, pk):
    if request.method != 'DELETE': return JsonResponse({'error': 'Bad method'}, status=405)
    if not request.user.is_authenticated: return JsonResponse({'error': 'Musíte se přihlásit'}, status=403)
    try:
        comment = Comment.objects.get(pk=pk)
        if comment.author == request.user:
            comment.delete()
            return JsonResponse({'message': 'Komentář byl smazán'})
        return JsonResponse({'error': 'Nemáte oprávnění'}, status=403)
    except Comment.DoesNotExist:
        return JsonResponse({'error': 'Nenalezeno'}, status=404)


@csrf_exempt
def api_delete_forum_thread(request, pk):
    if request.method != 'DELETE': return JsonResponse({'error': 'Bad method'}, status=405)
    if not request.user.is_authenticated: return JsonResponse({'error': 'Musíte se přihlásit'}, status=403)
    try:
        thread = ForumThread.objects.get(pk=pk)
        if thread.author == request.user:
            thread.delete()
            return JsonResponse({'message': 'Vlákno smazáno'})
        return JsonResponse({'error': 'Nemáte oprávnění'}, status=403)
    except ForumThread.DoesNotExist:
        return JsonResponse({'error': 'Nenalezeno'}, status=404)


@csrf_exempt
def api_delete_forum_post(request, pk):
    if request.method != 'DELETE': return JsonResponse({'error': 'Bad method'}, status=405)
    if not request.user.is_authenticated: return JsonResponse({'error': 'Musíte se přihlásit'}, status=403)
    try:
        post = ForumPost.objects.get(pk=pk)
        if post.author == request.user:
            post.delete()
            return JsonResponse({'message': 'Příspěvek smazán'})
        return JsonResponse({'error': 'Nemáte oprávnění'}, status=403)
    except ForumPost.DoesNotExist:
        return JsonResponse({'error': 'Nenalezeno'}, status=404)