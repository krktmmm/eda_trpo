from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from .models import Place, Review

def place_list(request):
    """Страница со списком всех заведений"""
    places = Place.objects.all().order_by('name')
    return render(request, 'places/place_list.html', {'places': places})

def place_detail(request, place_id):
    """Детальная страница заведения с отзывами"""
    place = get_object_or_404(Place, id=place_id)
    reviews = place.reviews.all().order_by('-created_at')  # все отзывы к этому заведению
    
    return render(request, 'places/place_detail.html', {'place': place, 'reviews': reviews})

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
            review = Review.objects.create(place=place, user=request.user, rating=int(rating), text=text, photo_url=photo_url)
            
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