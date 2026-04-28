from django import forms
from django.contrib.auth.models import User
from .models import Profile

class ProfileForm(forms.ModelForm):
    email = forms.EmailField(required=False, label="Email")

    class Meta:
        model = Profile
        fields = ['telegram', 'vk']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance.user:
            self.fields['email'].initial = self.instance.user.email

    def save(self, commit=True):
        profile = super().save(commit=False)
        if commit:
            profile.save()
            profile.user.email = self.cleaned_data['email']
            profile.user.save()
        return profile