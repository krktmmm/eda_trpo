from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from .models import Place, Review


def place_list(request):
    """Главная страница со списком заведений"""
    places = Place.objects.all().order_by('name')

    cuisines = (
        Place.objects.exclude(cuisine_type__isnull=True)
        .exclude(cuisine_type__exact='')
        .values_list('cuisine_type', flat=True)
        .distinct()
        .order_by('cuisine_type')
    )

    max_price_obj = Place.objects.exclude(avg_price__isnull=True).order_by('-avg_price').first()
    max_price_value = max_price_obj.avg_price if max_price_obj else 1000

    context = {
        'places': places,
        'cuisines': cuisines,
        'max_price_value': max_price_value,
    }
    return render(request, 'places/place_list.html', context)


def filter_places(request):
    """Живой поиск и фильтрация без перезагрузки"""
    query = request.GET.get('q', '').strip()
    cuisine = request.GET.get('cuisine', '').strip()
    building = request.GET.get('building', '').strip()
    max_price = request.GET.get('max_price', '').strip()

    places = Place.objects.all()

    if query:
        places = places.filter(name__icontains=query)

    if cuisine:
        places = places.filter(cuisine_type=cuisine)

    if building:
        places = places.filter(nearest_building=building)

    if max_price:
        try:
            places = places.filter(avg_price__lte=int(max_price))
        except ValueError:
            pass

    places = places.order_by('name')

    data = []
    for place in places:
        data.append({
            'id': place.id,
            'name': place.name,
            'address': place.address,
            'cuisine_type': place.cuisine_type,
            'avg_price': place.avg_price,
            'nearest_building': place.nearest_building,
            'rating': place.rating,
        })

    return JsonResponse({'places': data})


def place_detail(request, place_id):
    """Детальная страница заведения с отзывами"""
    place = get_object_or_404(Place, id=place_id)
    reviews = place.reviews.all().order_by('-created_at')

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
            Review.objects.create(
                place=place,
                user=request.user,
                rating=int(rating),
                text=text,
                photo_url=photo_url
            )

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