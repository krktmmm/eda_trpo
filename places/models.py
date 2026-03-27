from django.db import models

class Place(models.Model):
    """Модель заведения"""
    
    name = models.CharField(max_length=100, verbose_name="Название")
    address = models.CharField(max_length=200, verbose_name="Адрес")
    
    time_from_building_1 = models.IntegerField(default=100, verbose_name="Время от корпуса №1 (мин)")
    time_from_building_3 = models.IntegerField(default=100, verbose_name="Время от корпуса №3 (мин)")
    time_from_building_5 = models.IntegerField(default=100, verbose_name="Время от корпуса №5 (мин)")
    
    nearest_building = models.CharField(max_length=10, blank=True, verbose_name="Ближайший корпус", help_text="Например: №1, №3, №5")
    
    cuisine_type = models.CharField(max_length=100, blank=True, verbose_name="Тип кухни")
    avg_price = models.IntegerField(blank=True, null=True, verbose_name="Средний чек (₽)")
    opening_hours = models.CharField(max_length=200, blank=True, verbose_name="Часы работы")
    
    # пока только ссылка
    photo_url = models.URLField(blank=True, verbose_name="Ссылка на фото")
    
    # координаты для карты (фронт)
    latitude = models.FloatField(blank=True, null=True, verbose_name="Широта")
    longitude = models.FloatField(blank=True, null=True, verbose_name="Долгота")
    
    rating = models.FloatField(default=0, verbose_name="Рейтинг")
    rating_count = models.IntegerField(default=0, verbose_name="Количество оценок")
    
    def __str__(self):
        """Как будет отображаться объект в админке"""
        return self.name
    
    class Meta:
        verbose_name = "Заведение"
        verbose_name_plural = "Заведения"


class Review(models.Model):
    """Отзыв о заведении"""
    
    place = models.ForeignKey(Place, on_delete=models.CASCADE, related_name='reviews', verbose_name="Заведение")
    user = models.ForeignKey('auth.User', on_delete=models.CASCADE, verbose_name="Автор")

    rating = models.IntegerField(choices=[(i, i) for i in range(1, 6)], verbose_name="Оценка (1-5)")
    text = models.TextField(verbose_name="Текст отзыва")

    # пока только ссылка
    photo_url = models.URLField(blank=True, verbose_name="Ссылка на фото")
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата создания")
    
    def __str__(self):
        return f"{self.user.username} - {self.place.name} - {self.rating}⭐"
    
    class Meta:
        verbose_name = "Отзыв"
        verbose_name_plural = "Отзывы"