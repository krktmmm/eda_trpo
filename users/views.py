from django.shortcuts import render, redirect
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from places.models import Review

def login_view(request):
    login_form = AuthenticationForm()
    register_form = UserCreationForm()
    
    if request.method == 'POST':
        # Проверяем, какая форма отправлена
        if 'password1' in request.POST:
            # Это форма регистрации
            form = UserCreationForm(request.POST)
            if form.is_valid():
                user = form.save()
                login(request, user)
                return redirect('/')
            else:
                return render(request, 'registration/auth.html', {'login_form': login_form, 'register_form': form})
        else:
            # Это форма входа
            form = AuthenticationForm(request, data=request.POST)
            if form.is_valid():
                user = form.get_user()
                login(request, user)
                return redirect('/')
            else:
                return render(request, 'registration/auth.html', {'login_form': form, 'register_form': register_form})
    
    return render(request, 'registration/auth.html', {'login_form': login_form, 'register_form': register_form})

@login_required
def profile(request):
    user_reviews = Review.objects.filter(user=request.user).order_by('-created_at')
    return render(request, 'users/profile.html', {'user': request.user, 'reviews': user_reviews})