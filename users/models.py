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