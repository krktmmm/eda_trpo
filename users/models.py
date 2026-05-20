from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from django.db import models
from django.utils import timezone

class Profile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    telegram = models.CharField(max_length=100, blank=True)
    vk = models.CharField(max_length=100, blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True, verbose_name="Аватар")
    course = models.IntegerField(blank=True, null=True)
    group = models.CharField(max_length=20, blank=True)
    favorite_cuisine = models.CharField(max_length=100, blank=True)
    bio = models.TextField(blank=True)
    rating = models.FloatField(default=0, verbose_name="Рейтинг")
    rating_count = models.IntegerField(default=0, verbose_name="Количество оценок")
    theme = models.CharField(max_length=10, default='light', blank=True)
    font_size = models.CharField(max_length=10, default='medium', blank=True)
    greeting_style = models.CharField(max_length=20, default='sweet', blank=True)
    animations = models.CharField(max_length=5, default='on', blank=True)
    last_activity = models.DateTimeField(default=timezone.now, verbose_name="Последняя активность")
    
    def __str__(self):
        return f"Profile of {self.user.username}"
    
    def is_online(self):
        """Проверяет, онлайн ли пользователь (активность в последние 5 минут)"""
        if not self.last_activity:
            return False
        delta = timezone.now() - self.last_activity
        return delta.total_seconds() < 300  # 5 минут
    
    def get_last_activity_display(self):
        """Возвращает умное отображение последней активности"""
        if not self.last_activity:
            return "—"
        
        now = timezone.now()
        delta = now - self.last_activity
        time_str = self.last_activity.strftime('%H:%M')
        
        # Сегодня (менее 24 часов)
        if delta.days == 0:
            return f"в {time_str}"
        
        # Вчера (24-48 часов)
        if delta.days == 1:
            return f"вчера в {time_str}"
        
        # 2-7 дней назад
        if delta.days < 7:
            days = delta.days
            if days % 10 == 1 and days % 100 != 11:
                day_word = "день"
            elif 2 <= days % 10 <= 4 and (days % 100 < 10 or days % 100 >= 20):
                day_word = "дня"
            else:
                day_word = "дней"
            return f"{days} {day_word} назад в {time_str}"
        
        # Более 7 дней, но менее года
        if delta.days < 365:
            return f"{self.last_activity.strftime('%-d %B')} в {time_str}"
        
        # Более года
        return f"{self.last_activity.strftime('%d.%m.%Y')} в {time_str}"
        
    class Meta:
        verbose_name = "Профиль"
        verbose_name_plural = "Профили пользователей"

@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)

@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def save_user_profile(sender, instance, **kwargs):
    if hasattr(instance, 'profile'):
        instance.profile.save()