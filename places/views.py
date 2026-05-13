from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from .models import Place, Review, Favorite
from django.http import JsonResponse
from django.utils import timezone
from datetime import timedelta
import difflib

def main_menu(request):
    """Стартовая страница с выбором: заведения или рулетка"""
    return render(request, 'places/main_menu.html')

def place_list(request):
    """Страница со списком всех заведений (выбор корпуса и времени)"""
    search_query = request.GET.get('search', '').strip()
    places = Place.objects.all().order_by('name')
    if search_query:
        search_normalized = (
            search_query
            .replace('ё', 'е')
            .replace('Ё', 'Е')
            .lower()
        )
        places = [
            place for place in places
            if search_normalized in (
                place.name
                .replace('ё', 'е')
                .replace('Ё', 'Е')
                .lower()
            )
        ]
    favorited_ids = []
    if request.user.is_authenticated:
        favorited_ids = Favorite.objects.filter(
            user=request.user
        ).values_list('place_id', flat=True)
    places_for_map = []
    for place in places:
        if place.latitude and place.longitude:
            places_for_map.append({
                "id": place.id,
                "name": place.name,
                "address": place.address,
                "lat": place.latitude,
                "lng": place.longitude,
                "nearest_building": place.nearest_building,
            })

    return render(request, 'places/place_list.html', {
        'places': places,
        'favorited_ids': list(favorited_ids),
        'search_query': search_query,
        'places_for_map': places_for_map,
    })

def roulette(request):
    """Страница обед-рулетки"""
    return render(request, 'roulette/roulette.html')

def place_detail(request, place_id):
    """Детальная страница заведения с отзывами"""
    place = get_object_or_404(Place, id=place_id)
    reviews = place.reviews.all().order_by('-created_at')
    is_favorited = False
    has_reviewed = False
    if request.user.is_authenticated:
        has_reviewed = place.reviews.filter(user=request.user).exists()
        is_favorited = Favorite.objects.filter(user=request.user, place=place).exists()
        
    for review in reviews:
        review.stars_display = "⭐" * review.rating
        review.is_old = timezone.now() - review.created_at > timedelta(hours=24)

    # Сообщение только для этой страницы
    review_message = request.session.pop('review_message', None)

    return render(request, 'places/place_detail.html', {
        'place': place,
        'reviews': reviews,
        'is_favorited': is_favorited,
        'has_reviewed': has_reviewed,
        'review_message': review_message,
    })

@login_required
def add_review(request, place_id):
    """Добавление отзыва (только для авторизованных)"""
    place = get_object_or_404(Place, id=place_id)
    
    if Review.objects.filter(place=place, user=request.user).exists():
        request.session['review_message'] = {'type': 'error', 'text': 'Вы уже оставляли отзыв для этого заведения!'}
        return redirect('place_detail', place_id=place.id)
    
    if request.method == 'POST':
        rating = request.POST.get('rating')
        text = request.POST.get('text')
        photo_url = request.POST.get('photo_url', '')
        
        if rating:
            Review.objects.create(
                place=place,
                user=request.user,
                rating=int(rating),
                text=text,
                photo_url=photo_url
            )
            
            all_reviews = place.reviews.all()
            total_rating = sum(r.rating for r in all_reviews)
            count = all_reviews.count()
            place.rating = total_rating / count if count > 0 else 0
            place.rating_count = all_reviews.count()
            place.save()
            
            request.session['review_message'] = {'type': 'success', 'text': 'Отзыв добавлен!'}
        else:
            request.session['review_message'] = {'type': 'error', 'text': 'Заполните все поля'}
        
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

@login_required
def delete_review(request, review_id):
    """Удаление отзыва (только свой)"""
    review = get_object_or_404(Review, id=review_id)
    
    if review.user != request.user:
        return JsonResponse({'error': 'Нельзя удалить чужой отзыв'}, status=403)
    
    place = review.place
    review.delete()
    
    all_reviews = place.reviews.all()
    if all_reviews.exists():
        total_rating = sum(r.rating for r in all_reviews)
        place.rating = total_rating / all_reviews.count()
        place.rating_count = all_reviews.count()
    else:
        place.rating = 0
        place.rating_count = 0
    place.save()

    request.session['review_message'] = {'type': 'error', 'text': '❌ Отзыв удалён!'}
    
    return JsonResponse({'status': 'ok'})

@login_required
def edit_review(request, review_id):
    """Редактирование отзыва"""
    review = get_object_or_404(Review, id=review_id)
    
    if review.user != request.user:
        request.session['review_message'] = {'type': 'error', 'text': 'Нельзя редактировать чужой отзыв'}
        return redirect('place_detail', place_id=review.place.id)
    
    if timezone.now() - review.created_at > timedelta(hours=24):
        request.session['review_message'] = {'type': 'error', 'text': 'Редактировать отзыв можно только в течение 24 часов после публикации'}
        return redirect('place_detail', place_id=review.place.id)
    
    if request.method == 'POST':
        rating = request.POST.get('rating')
        text = request.POST.get('text')
        photo_url = request.POST.get('photo_url', '')
        
        if rating:
            # Проверяем, изменилось ли что-то
            if (int(rating) == review.rating and 
                text == review.text and 
                photo_url == review.photo_url):
                request.session['review_message'] = {'type': 'warning', 'text': '⚠️ Ничего не изменилось'}
                return redirect('place_detail', place_id=review.place.id)
            
            review.rating = int(rating)
            review.text = text
            review.photo_url = photo_url
            review.save()
            
            place = review.place
            all_reviews = place.reviews.all()
            total_rating = sum(r.rating for r in all_reviews)
            place.rating = total_rating / all_reviews.count()
            place.save()
            
            request.session['review_message'] = {'type': 'success', 'text': '✅ Отзыв обновлён!'}
            return redirect('place_detail', place_id=place.id)
    
    time_left = review.created_at + timedelta(hours=24) - timezone.now()
    edit_hours = max(0, int(time_left.total_seconds() / 3600))
    
    return render(request, 'places/edit_review.html', {
        'review': review,
        'stars_range': range(1, 6),
        'edit_hours': edit_hours,
    })

def search_places_api(request):
    query = request.GET.get("q", "").strip()
    if not query:
        return JsonResponse({"results": []})

    query_normalized = query.replace('ё', 'е').replace('Ё', 'Е')

    places = [
        place for place in Place.objects.all()
        if query_normalized.lower() in place.name.replace('ё', 'е').replace('Ё', 'Е').lower()
    ][:7]
    results = []
    for place in places:
        results.append({
            "id": place.id,
            "name": place.name,
            "address": place.address,
            "cuisine_type": place.cuisine_type,
            "avg_price": place.avg_price,
        })
    suggestion = None
    if not results:
        all_names = list(Place.objects.values_list("name", flat=True))
        matches = difflib.get_close_matches(query, all_names, n=1, cutoff=0.5)
        if matches:
            suggestion = matches[0]
    return JsonResponse({
        "results": results,
        "suggestion": suggestion,
    })