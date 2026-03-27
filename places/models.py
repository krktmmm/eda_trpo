from django.db import models

class Place(models.Model):
    """Модель заведения"""
    
    # Основная информация
    name = models.CharField(max_length=100, verbose_name="Название")
    address = models.CharField(max_length=200, verbose_name="Адрес")
    
    # Время пешком от корпусов
    time_from_building_1 = models.IntegerField(default=100, verbose_name="Время от корпуса №1 (мин)")
    time_from_building_3 = models.IntegerField(default=100, verbose_name="Время от корпуса №3 (мин)")
    time_from_building_5 = models.IntegerField(default=100, verbose_name="Время от корпуса №5 (мин)")
    
    # Какой корпус ближе всего
    nearest_building = models.CharField(max_length=10, blank=True, verbose_name="Ближайший корпус", help_text="Например: №1, №3, №5")
    
    # Характеристики
    cuisine_type = models.CharField(max_length=100, blank=True, verbose_name="Тип кухни")
    avg_price = models.IntegerField(blank=True, null=True, verbose_name="Средний чек (₽)")
    opening_hours = models.CharField(max_length=200, blank=True, verbose_name="Часы работы")
    
    # Ссылка на фото (потом будет просто фотка без ссылок)
    photo_url = models.URLField(blank=True, verbose_name="Ссылка на фото")
    
    # Координаты для карты
    latitude = models.FloatField(blank=True, null=True, verbose_name="Широта")
    longitude = models.FloatField(blank=True, null=True, verbose_name="Долгота")
    
    # Статистика (будет заполняться автоматически из отзывов)
    rating = models.FloatField(default=0, verbose_name="Рейтинг")
    rating_count = models.IntegerField(default=0, verbose_name="Количество оценок")
    
    def __str__(self):
        """Как будет отображаться объект в админке"""
        return self.name
    
    class Meta:
        verbose_name = "Заведение"
        verbose_name_plural = "Заведения"