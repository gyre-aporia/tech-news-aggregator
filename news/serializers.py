from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Profile, Category, News, Comment, RSSSource

class NewsSerializer(serializers.ModelSerializer):
    comment_count = serializers.SerializerMethodField()
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = News
        fields = [
            'id', 'title', 'description', 'source', 'image_url', 
            'category_name', 'link', 'pub_date', 'word_count', 'comment_count'
        ]        

    def get_comment_count(self, obj):
        return obj.comments.count()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'
        
class ProfileSerializer(serializers.ModelSerializer):
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

class RSSSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = RSSSource
        fields = '__all__'