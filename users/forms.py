from django import forms
from django.contrib.auth.models import User
from django.contrib.auth.forms import PasswordChangeForm
from .models import Profile

class ProfileForm(forms.ModelForm):
    username = forms.CharField(max_length=150, required=True, label="Имя пользователя")
    password = forms.CharField(
        widget=forms.PasswordInput,
        required=False,
        label="Новый пароль (оставьте пустым, если не хотите менять)"
    )

    class Meta:
        model = Profile
        fields = ['telegram', 'vk']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance.user:
            self.fields['username'].initial = self.instance.user.username

    def save(self, commit=True):
        profile = super().save(commit=False)
        if commit:
            profile.save()
            user = profile.user
            user.username = self.cleaned_data['username']
            new_password = self.cleaned_data.get('password')
            if new_password:
                user.set_password(new_password)
            user.save()
        return profile