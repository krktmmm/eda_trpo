from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib.auth.decorators import login_required
from django.contrib.auth import update_session_auth_hash
from django.shortcuts import render, redirect
from django.contrib.auth import login
from django.http import JsonResponse
from places.models import Review
from .forms import ProfileForm
from .models import Profile

def login_view(request):
    if request.method == 'POST':
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            return redirect('/')
        else:
            return render(request, 'registration/auth.html', {
                'login_form': form,
                'register_form': UserCreationForm()
            })
    
    return render(request, 'registration/auth.html', {
        'login_form': AuthenticationForm(),
        'register_form': UserCreationForm()
    })

def register_view(request):
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect('/')
    else:
        form = UserCreationForm()
    
    return render(request, 'registration/auth.html', {
        'register_form': form,
        'login_form': AuthenticationForm()
    })

@login_required
def profile(request):
    user_reviews = Review.objects.filter(user=request.user).order_by('-created_at')
    return render(request, 'users/profile.html', {'user': request.user, 'reviews': user_reviews})

@login_required
def edit_profile(request):
    profile, created = Profile.objects.get_or_create(user=request.user)
    if request.method == 'POST':
        form = ProfileForm(request.POST, request.FILES, instance=profile)
        if form.is_valid():
            form.save()
            if 'password' in form.changed_data:
                update_session_auth_hash(request, request.user)
            return redirect('profile')
    else:
        form = ProfileForm(instance=profile)
    return render(request, 'users/edit_profile.html', {'form': form})

@login_required
def delete_avatar(request):
    if request.method == 'POST':
        profile = request.user.profile
        if profile.avatar:
            profile.avatar.delete()
            profile.avatar = None
            profile.save()
            return JsonResponse({'status': 'ok'})
    return JsonResponse({'status': 'error'}, status=400)

@login_required
def settings_view(request):
    profile = request.user.profile
    if request.method == 'POST':
        profile.theme = request.POST.get('theme', 'light')
        profile.font_size = request.POST.get('font_size', 'medium')
        profile.greeting_style = request.POST.get('greeting_style', 'sweet')
        profile.animations = request.POST.get('animations', 'on')
        profile.save()
        return redirect('settings')
    return render(request, 'users/settings.html', {'profile': profile})