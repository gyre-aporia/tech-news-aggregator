from django.shortcuts import render, redirect, get_object_or_404
from .models import News, Category, Profile, Comment
from django.contrib.auth import login
from .forms import MyCustomSignupForm, ProfileForm, UserUpdateForm, CommentForm
from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.db.models import Q

# --- ГЛАВНАЯ СТРАНИЦА ---
def index(request):
    filter_category = request.GET.get('category')
    search_query = request.GET.get('q')

    # 1. Получаем все новости
    news_list = News.objects.all().order_by('-id')

    if search_query:
        news_list = news_list.filter(
            Q(title__icontains=search_query) |
            Q(description__icontains=search_query)
        )

    # 2. Фильтруем, если нажали категорию
    if filter_category:
        news_list = news_list.filter(category__name=filter_category)

    # 3. НАСТРАИВАЕМ ПАГИНАЦИЮ (9 новостей на страницу)
    paginator = Paginator(news_list, 20)
    page_number = request.GET.get('page')  # Смотрим, какую страницу просит пользователь
    page_obj = paginator.get_page(page_number)  # Отдаем нужный кусок

    categories = Category.objects.all()

    context = {
        'news_list': page_obj,  # <-- ВАЖНО: теперь передаем не news_list, а page_obj
        'categories': categories,
        'selected_category': filter_category,
        'search_query': search_query
    }
    return render(request, 'news/index.html', context)

# --- РЕГИСТРАЦИЯ ---
def signup(request):
    if request.method == 'POST':
        form = MyCustomSignupForm(request.POST)
        if form.is_valid():
            user = form.save()
            # Это хак для автоматического входа, чтобы не требовать email-подтверждения
            user.backend = 'django.contrib.auth.backends.ModelBackend'
            login(request, user)
            return redirect('/')
    else:
        form = MyCustomSignupForm()
    return render(request, 'registration/signup.html', {'form': form})

# --- ПРОСМОТР ПРОФИЛЯ ---
@login_required
def profile_view(request):
    profile, created = Profile.objects.get_or_create(user=request.user)
    return render(request, 'news/profile.html', {'profile': profile})

# --- РЕДАКТИРОВАНИЕ ПРОФИЛЯ (Исправленная версия) ---
@login_required
def edit_profile(request):
    if request.method == 'POST':
        # Заполняем обе формы данными из запроса
        u_form = UserUpdateForm(request.POST, instance=request.user)
        p_form = ProfileForm(request.POST, request.FILES, instance=request.user.profile)

        # Если ОБЕ формы заполнены правильно
        if u_form.is_valid() and p_form.is_valid():
            u_form.save() # Сохраняем имя/email
            p_form.save() # Сохраняем аватарку/био
            return redirect('profile') # Возвращаем на просмотр
    else:
        # Если просто открыли страницу - показываем текущие данные
        u_form = UserUpdateForm(instance=request.user)
        p_form = ProfileForm(instance=request.user.profile)

    context = {
        'u_form': u_form,
        'p_form': p_form
    }
    return render(request, 'news/profile_edit.html', context)


def news_detail(request, pk):
    news = get_object_or_404(News, pk=pk)

    # Получаем все комментарии к этой новости
    comments = news.comments.all()

    # Обработка формы (если отправили комментарий)
    if request.method == 'POST':
        if request.user.is_authenticated:  # Только для вошедших
            comment_form = CommentForm(request.POST)
            if comment_form.is_valid():
                new_comment = comment_form.save(commit=False)  # Пока не сохраняем в БД
                new_comment.post = news  # Привязываем к текущей новости
                new_comment.author = request.user  # Привязываем к автору
                new_comment.save()  # Теперь сохраняем окончательно
                return redirect('news_detail', pk=pk)  # Обновляем страницу, чтобы увидеть коммент
        else:
            return redirect('login')  # Если не вошел - на логин
    else:
        comment_form = CommentForm()

    return render(request, 'news/news_detail.html', {
        'news': news,
        'comments': comments,
        'comment_form': comment_form
    })

@login_required
def delete_comment(request, pk):
    comment = get_object_or_404(Comment, pk=pk)

    # Проверка безопасности: удаляет только автор!
    if request.user == comment.author:
        news_id = comment.post.id  # Запоминаем ID новости, чтобы вернуться назад
        comment.delete()
        return redirect('news_detail', pk=news_id)
    else:
        # Если пытается удалить чужой коммент - просто вернем обратно
        return redirect('news_detail', pk=comment.post.id)


# --- РЕДАКТИРОВАНИЕ КОММЕНТАРИЯ ---
@login_required
def edit_comment(request, pk):
    comment = get_object_or_404(Comment, pk=pk)

    # Проверка безопасности: редактирует только автор!
    if request.user != comment.author:
        return redirect('news_detail', pk=comment.post.id)

    if request.method == 'POST':
        form = CommentForm(request.POST, instance=comment)  # Загружаем старый текст
        if form.is_valid():
            form.save()
            return redirect('news_detail', pk=comment.post.id)
    else:
        form = CommentForm(instance=comment)

    return render(request, 'news/comment_edit.html', {'form': form})