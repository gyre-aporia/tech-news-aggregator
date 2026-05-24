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
@api_view(['GET'])
@permission_classes([IsAuthenticated])  # Только для залогиненных
def api_profile(request):
    profile, created = Profile.objects.get_or_create(user=request.user)
    serializer = ProfileSerializer(profile)
    return Response(serializer.data)


# 3. API: Начислить опыт за чтение статьи (Пункт 5: Геймификация)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_add_points(request):
    profile = request.user.profile
    profile.points += 10  # Даем 10 очков за каждую прочитанную статью

    # Простая логика уровней: каждые 50 очков дают новый уровень
    if profile.points >= (profile.level * 50):
        profile.level += 1

    profile.save()

    # Отвечаем Реакту, что всё прошло успешно, и отдаем новые значения
    return Response({
        'message': 'Článek přečten! Získáváš 10 XP.',
        'points': profile.points,
        'level': profile.level
    })