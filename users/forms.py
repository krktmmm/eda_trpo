from django.contrib.auth.forms import PasswordChangeForm
from django.contrib.auth.models import User
from .models import Profile
from django import forms

class ProfileForm(forms.ModelForm):
    username = forms.CharField(max_length=150, required=True, label="Имя пользователя")
    email = forms.EmailField(required=False, label="Email")
    password = forms.CharField(
        widget=forms.PasswordInput,
        required=False,
        label="Новый пароль (оставьте пустым, если не хотите менять)"
    )
    course = forms.ChoiceField(
        choices=[('', '— Выберите курс —')] + [(str(i), f'{i} курс') for i in range(1, 7)],
        required=False,
        label="Курс"
    )
    group = forms.CharField(max_length=20, required=False, label="Группа")
    favorite_cuisine = forms.CharField(max_length=100, required=False, label="Любимая кухня")
    bio = forms.CharField(widget=forms.Textarea, required=False, label="О себе")

    class Meta:
        model = Profile
        fields = ['telegram', 'vk', 'avatar', 'course', 'group', 'favorite_cuisine', 'bio']
        widgets = {
            'avatar': forms.FileInput(attrs={'class': 'form-control'}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance.user:
            self.fields['username'].initial = self.instance.user.username
            self.fields['email'].initial = self.instance.user.email
            self.fields['course'].initial = self.instance.course
            self.fields['group'].initial = self.instance.group
            self.fields['favorite_cuisine'].initial = self.instance.favorite_cuisine
            self.fields['bio'].initial = self.instance.bio

    def save(self, commit=True):
        profile = super().save(commit=False)
        course_value = self.cleaned_data.get('course')
        profile.course = int(course_value) if course_value else None
        profile.group = self.cleaned_data.get('group') or ''
        profile.favorite_cuisine = self.cleaned_data.get('favorite_cuisine') or ''
        profile.bio = self.cleaned_data.get('bio') or ''
        if commit:
            profile.save()
            user = profile.user
            user.username = self.cleaned_data['username']
            user.email = self.cleaned_data.get('email', '')
            new_password = self.cleaned_data.get('password')
            if new_password:
                user.set_password(new_password)
            user.save()
        return profile