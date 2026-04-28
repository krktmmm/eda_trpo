from django.db import models
from django.contrib.auth.models import User

class SoloRequest(models.Model):
    """Заявка на поиск сообедника"""
    
    BUILDING_CHOICES = [
        ('1', 'Корпус №1'),
        ('3', 'Корпус №3'),
        ('5', 'Корпус №5'),
    ]
    
    BUDGET_CHOICES = [
        ('economy', 'До 200 ₽'),
        ('medium', '200-400 ₽'),
        ('high', 'От 400 ₽'),
        ('any', 'Не важно'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='solo_requests')
    building = models.CharField(max_length=1, choices=BUILDING_CHOICES, verbose_name="Корпус")
    budget = models.CharField(max_length=10, choices=BUDGET_CHOICES, default='any', verbose_name="Бюджет")
    telegram = models.CharField(max_length=100, blank=True, verbose_name="Telegram")
    vk = models.CharField(max_length=100, blank=True, verbose_name="VK")
    is_active = models.BooleanField(default=True, verbose_name="Активна")
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user.username} - корпус {self.building}"
    
    class Meta:
        verbose_name = "Заявка (один)"
        verbose_name_plural = "Заявки (один)"


class GroupRequest(models.Model):
    """Заявка на поиск компании (2+ человек)"""
    
    BUILDING_CHOICES = [
        ('1', 'Корпус №1'),
        ('3', 'Корпус №3'),
        ('5', 'Корпус №5'),
    ]
    
    BUDGET_CHOICES = [
        ('economy', 'До 200 ₽'),
        ('medium', '200–400 ₽'),
        ('high', 'От 400 ₽'),
        ('any', 'Не важно'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='group_requests')
    building = models.CharField(max_length=1, choices=BUILDING_CHOICES, verbose_name="Корпус")
    budget = models.CharField(max_length=10, choices=BUDGET_CHOICES, default='any', verbose_name="Бюджет")
    needed_people = models.IntegerField(default=2, verbose_name="Сколько человек нужно")
    current_members = models.IntegerField(default=1, verbose_name="Сколько уже собралось")
    telegram = models.CharField(max_length=100, blank=True, verbose_name="Telegram")
    vk = models.CharField(max_length=100, blank=True, verbose_name="VK")
    is_active = models.BooleanField(default=True, verbose_name="Активна")
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.user.username} - ищет {self.needed_people} чел. в корпус {self.building}"
    
    class Meta:
        verbose_name = "Заявка (группа)"
        verbose_name_plural = "Заявки (группа)"


class GroupMember(models.Model):
    """Участники групповой заявки"""
    group = models.ForeignKey(GroupRequest, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    joined_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Участник группы"
        verbose_name_plural = "Участники группы"
        unique_together = ('group', 'user')