from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Profile, Category, News, Comment, Thread, RSSSource

# Базовый сериализатор для пользователя (чтобы не передавать пароли в React, только нужное)
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

class NewsSerializer(serializers.ModelSerializer):
    # Добавляем текстовое название категории, чтобы в React выводить "Sport", а не просто цифру 1
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = News
        fields = '__all__'

class ProfileSerializer(serializers.ModelSerializer):
    # Вкладываем данные пользователя и его избранные статьи прямо в профиль
    user = UserSerializer(read_only=True)
    preferred_categories = CategorySerializer(many=True, read_only=True)
    read_later = NewsSerializer(many=True, read_only=True)

    class Meta:
        model = Profile
        fields = '__all__'

class CommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.username', read_only=True)

    class Meta:
        model = Comment
        fields = '__all__'

class ThreadSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.username', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    # Считаем количество апвоутов и даунвоутов для форума
    upvotes_count = serializers.IntegerField(source='upvotes.count', read_only=True)
    downvotes_count = serializers.IntegerField(source='downvotes.count', read_only=True)

    class Meta:
        model = Thread
        fields = '__all__'

class RSSSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = RSSSource
        fields = '__all__'