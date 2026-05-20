from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib.auth import update_session_auth_hash, get_user_model
from django.shortcuts import get_object_or_404, render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import PasswordChangeForm
from django.contrib.auth import login
from django.http import JsonResponse
from django.contrib import messages
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

User = get_user_model()

@login_required
def public_profile(request, username):
    """Просмотр профиля другого пользователя"""
    target_user = get_object_or_404(User, username=username)
    
    # Не даём смотреть свой профиль через эту страницу
    if target_user == request.user:
        return redirect('profile')
    
    # Отзывы пользователя
    user_reviews = Review.objects.filter(user=target_user).order_by('-created_at')
    
    return render(request, 'users/public_profile.html', {
        'target_user': target_user,
        'reviews': user_reviews,
    })

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
def change_password(request):
    if request.method == 'POST':
        form = PasswordChangeForm(request.user, request.POST)
        if form.is_valid():
            user = form.save()
            # Обновляем сессию, чтобы пользователь не вышел
            update_session_auth_hash(request, user)
            messages.success(request, 'Пароль успешно изменён!')
            return redirect('profile')
        else:
            messages.error(request, 'Пожалуйста, исправьте ошибки ниже.')
    else:
        form = PasswordChangeForm(request.user)
    
    return render(request, 'users/change_password.html', {'form': form})

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