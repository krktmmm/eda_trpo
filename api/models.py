from django.conf import settings
from django.db import models

class FCMToken(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    token = models.CharField(max_length=255, unique=True)
    device_type = models.CharField(max_length=10, choices=[
        ('ios', 'iOS'),
        ('android', 'Android'),
    ])
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "FCM Токен"
        verbose_name_plural = "FCM Токены"
    
    def __str__(self):
        return f"{self.user.username} - {self.device_type}"