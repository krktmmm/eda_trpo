from django.contrib.auth.models import User
from django.db import models

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
    dialog = models.ForeignKey('Dialog', on_delete=models.SET_NULL, null=True, blank=True, related_name='group')
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


class Dialog(models.Model):
    """Диалог между пользователями"""
    participants = models.ManyToManyField(User, related_name='dialogs')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Диалог"
        verbose_name_plural = "Диалоги"
    
    def __str__(self):
        return f"Dialog {self.id}"
    
    @classmethod
    def get_or_create_dialog(cls, user1, user2):
        """Создать или найти существующий диалог"""
        u1, u2 = sorted([user1, user2], key=lambda u: u.id)
        dialog = cls.objects.filter(participants=u1).filter(participants=u2).first()
        if dialog:
            return dialog, False
        dialog = cls.objects.create()
        dialog.participants.add(u1, u2)
        return dialog, True
    
    @classmethod
    def create_group_dialog(cls, users):
        """Создать групповой диалог для компании"""
        dialog = cls.objects.create()
        for user in users:
            dialog.participants.add(user)
        return dialog


class Message(models.Model):
    """Сообщение в диалоге"""
    dialog = models.ForeignKey(Dialog, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    text = models.TextField(max_length=2000)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['created_at']
        verbose_name = "Сообщение"
        verbose_name_plural = "Сообщения"
    
    def __str__(self):
        return f"{self.sender.username}: {self.text[:30]}"