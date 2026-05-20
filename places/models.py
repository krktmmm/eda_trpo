from django.conf import settings
from django.db import models

class Place(models.Model):
    """Модель заведения"""
    
    name = models.CharField(max_length=100, verbose_name="Название")
    address = models.CharField(max_length=200, verbose_name="Адрес")

    time_from_building_1 = models.IntegerField(default=100, verbose_name="Время от корпуса №1 (мин)")
    time_from_building_3 = models.IntegerField(default=100, verbose_name="Время от корпуса №3 (мин)")
    time_from_building_5 = models.IntegerField(default=100, verbose_name="Время от корпуса №5 (мин)")
    
    nearest_building = models.CharField(max_length=5, blank=True, verbose_name="Ближайший корпус", help_text="Например: №1, №3 или №5")
    
    cuisine_type = models.CharField(max_length=100, blank=True, verbose_name="Вид заведения")
    avg_price = models.IntegerField(blank=True, null=True, verbose_name="Средний чек (₽)")
    student_discount = models.CharField(max_length=20, blank=True, verbose_name="Скидка для студентов")
    opening_hours = models.CharField(max_length=200, blank=True, verbose_name="Часы работы")
    
    image = models.ImageField(upload_to='place_photos/', blank=True, null=True, verbose_name="Фото заведения")
    
    # координаты для карты (фронт)
    latitude = models.FloatField(blank=True, null=True, verbose_name="Широта")
    longitude = models.FloatField(blank=True, null=True, verbose_name="Долгота")
    
    rating = models.FloatField(default=0, verbose_name="Рейтинг")
    rating_count = models.IntegerField(default=0, verbose_name="Количество оценок")
    
    def __str__(self):
        return self.name
    
    class Meta:
        verbose_name = "Заведение"
        verbose_name_plural = "Заведения"


class ReviewImage(models.Model):
    """Фотографии к отзыву"""
    review = models.ForeignKey('Review', on_delete=models.CASCADE, related_name='images', verbose_name="Отзыв")
    image = models.ImageField(upload_to='review_photos/', verbose_name="Фото")
    order = models.IntegerField(default=0, verbose_name="Порядок")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['order', 'created_at']
        verbose_name = "Фото отзыва"
        verbose_name_plural = "Фото отзывов"
    
    def __str__(self):
        return f"Фото к отзыву #{self.review.id}"


class Review(models.Model):
    """Отзыв о заведении"""
    
    place = models.ForeignKey(Place, on_delete=models.CASCADE, related_name='reviews', verbose_name="Заведение")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, verbose_name="Автор")

    rating = models.IntegerField(choices=[(i, i) for i in range(1, 6)], verbose_name="Оценка (1-5)")
    text = models.TextField(verbose_name="Текст отзыва")
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата создания")
    
    def __str__(self):
        return f"{self.user.username} - {self.place.name} - {self.rating}⭐"
    
    class Meta:
        verbose_name = "Отзыв"
        verbose_name_plural = "Отзывы"


class Favorite(models.Model):
    """Избранные заведения пользователя"""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='favorites')
    place = models.ForeignKey(Place, on_delete=models.CASCADE, related_name='favorited_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'place')
        verbose_name = "Избранное"
        verbose_name_plural = "Избранное"

    def __str__(self):
        return f"{self.user.username} - {self.place.name}"