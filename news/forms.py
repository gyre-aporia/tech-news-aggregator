from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User

class MyCustomSignupForm(UserCreationForm):
    email = forms.EmailField(required=True)

    hobby = forms.CharField(required=False)

    def __init__(self, *args, **kwargs):
        super(MyCustomSignupForm, self).__init__(*args, **kwargs)
        # Пробегаемся по всем полям и убираем лишние подсказки,
        # чтобы они не захламляли экран (оставим только важные)
        for field_name, field in self.fields.items():
            # Добавляем класс, если захотим стилизовать через класс (опционально)
            field.widget.attrs['class'] = 'form-control'
            # Добавляем placeholder (текст внутри поля)
            field.widget.attrs['placeholder'] = field.label

    class Meta:
        model = User
        fields = ('username', 'email', 'hobby')

    def save(self, commit=True):
        user = super().save(commit=False)
        user.email = self.cleaned_data['email']

        if commit:
            user.save()

            from .models import Profile
            Profile.objects.create(user=user, hobby=self.cleaned_data['hobby'])

        return user