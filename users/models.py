from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from django.db import models

class Profile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    telegram = models.CharField(max_length=100, blank=True)
    vk = models.CharField(max_length=100, blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True, verbose_name="Аватар")
    course = models.IntegerField(blank=True, null=True)
    group = models.CharField(max_length=20, blank=True)
    favorite_cuisine = models.CharField(max_length=100, blank=True)
    bio = models.TextField(blank=True)
    theme = models.CharField(max_length=10, default='light', blank=True)
    font_size = models.CharField(max_length=10, default='medium', blank=True)
    greeting_style = models.CharField(max_length=20, default='sweet', blank=True)
    animations = models.CharField(max_length=5, default='on', blank=True)
    
    def __str__(self):
        return f"Profile of {self.user.username}"
    
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