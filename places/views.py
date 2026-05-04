from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.db.models import Avg, Count
from django.http import JsonResponse
from django.contrib import messages
from .models import Place, Review
from .models import Favorite

def main_menu(request):
    """Стартовая страница с выбором: заведения или рулетка"""
    return render(request, 'places/main_menu.html')

def place_list(request):
    """Страница со списком всех заведений (выбор корпуса и времени)"""
    places = Place.objects.all().order_by('name')
    
    # Получаем список ID заведений, которые пользователь добавил в избранное
    favorited_ids = []
    if request.user.is_authenticated:
        favorited_ids = Favorite.objects.filter(user=request.user).values_list('place_id', flat=True)
    
    return render(request, 'places/place_list.html', {
        'places': places,
        'favorited_ids': list(favorited_ids),
    })

def roulette(request):
    """Страница обед-рулетки"""
    return render(request, 'roulette/roulette.html')

def place_detail(request, place_id):
    """Детальная страница заведения с отзывами"""
    place = get_object_or_404(Place, id=place_id)
    reviews = place.reviews.all().order_by('-created_at')  # все отзывы к этому заведению
    is_favorited = False
    if request.user.is_authenticated:
        is_favorited = Favorite.objects.filter(user=request.user, place=place).exists()
    
    return render(request, 'places/place_detail.html', {
        'place': place,
        'reviews': reviews,
        'is_favorited': is_favorited,
    })

@login_required
def add_review(request, place_id):
    """Добавление отзыва (только для авторизованных)"""
    place = get_object_or_404(Place, id=place_id)
    
    if request.method == 'POST':
        rating = request.POST.get('rating')
        text = request.POST.get('text')
        photo_url = request.POST.get('photo_url', '')
        
        if rating and text:
            # Создаём отзыв
            review = Review.objects.create(
                place=place,
                user=request.user,
                rating=int(rating),
                text=text,
                photo_url=photo_url
                )
            
            # Обновляем рейтинг заведения
            all_reviews = place.reviews.all()
            total_rating = sum(r.rating for r in all_reviews)
            place.rating = total_rating / all_reviews.count()
            place.rating_count = all_reviews.count()
            place.save()
            
            messages.success(request, 'Отзыв добавлен!')
        else:
            messages.error(request, 'Заполните все поля')
        
        return redirect('place_detail', place_id=place.id)
    
    return redirect('place_detail', place_id=place.id)


@login_required
def favorites_list(request):
    """Страница со списком избранных заведений"""
    favorites = Favorite.objects.filter(user=request.user).select_related('place')
    return render(request, 'places/favorites.html', {'favorites': favorites})


@login_required
def toggle_favorite(request, place_id):
    """Добавить/удалить заведение из избранного (AJAX)"""
    place = get_object_or_404(Place, id=place_id)
    favorite = Favorite.objects.filter(user=request.user, place=place)
    
    if favorite.exists():
        favorite.delete()
        is_favorited = False
    else:
        Favorite.objects.create(user=request.user, place=place)
        is_favorited = True
    
    return JsonResponse({'is_favorited': is_favorited})