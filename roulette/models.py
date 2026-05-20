from django.conf import settings
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
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='solo_requests')
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
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='group_requests')
    building = models.CharField(max_length=1, choices=BUILDING_CHOICES, verbose_name="Корпус")
    budget = models.CharField(max_length=10, choices=BUDGET_CHOICES, default='any', verbose_name="Бюджет")
    needed_people = models.IntegerField(default=3, verbose_name="Сколько всего человек (включая тебя)")
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
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    joined_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Участник группы"
        verbose_name_plural = "Участники группы"
        unique_together = ('group', 'user')

class UserRating(models.Model):
    """Оценка пользователя после встречи"""
    from_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ratings_given', verbose_name="Кто оценил")
    to_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ratings_received', verbose_name="Кого оценили")
    rating = models.IntegerField(choices=[(i, i) for i in range(1, 6)], verbose_name="Оценка (1-5)")
    text = models.TextField(blank=True, verbose_name="Комментарий")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('from_user', 'to_user', 'created_at')
        verbose_name = "Оценка пользователя"
        verbose_name_plural = "Оценки пользователей"

    def __str__(self):
        return f"{self.from_user.username} → {self.to_user.username}: {self.rating}⭐"

class Dialog(models.Model):
    """Диалог между пользователями"""
    participants = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='dialogs')
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Поля для завершения обеда
    is_meal_completed = models.BooleanField(default=False)
    completed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='completed_dialogs')
    completed_at = models.DateTimeField(null=True, blank=True)

    is_group_chat = models.BooleanField(default=False)
    
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


class GroupRatingProgress(models.Model):
    """Прогресс оценки участников группового чата"""
    dialog = models.ForeignKey(Dialog, on_delete=models.CASCADE, related_name='rating_progress')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='group_ratings_progress')
    rated_users = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='rated_by_in_group', blank=True)
    skipped_users = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='skipped_by_in_group', blank=True)
    current_index = models.IntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('dialog', 'user')
        verbose_name = "Прогресс оценки группы"
        verbose_name_plural = "Прогресс оценки групп"
    
    def __str__(self):
        return f"{self.user.username} - диалог {self.dialog.id}"


class GroupUserRating(models.Model):
    """Оценка пользователя в групповом чате"""
    dialog = models.ForeignKey(Dialog, on_delete=models.CASCADE, related_name='group_ratings')
    from_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='group_ratings_given')
    to_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='group_ratings_received')
    rating = models.IntegerField(choices=[(i, i) for i in range(1, 6)], verbose_name="Оценка (1-5)")
    text = models.TextField(blank=True, verbose_name="Комментарий")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('dialog', 'from_user', 'to_user')
        verbose_name = "Оценка в группе"
        verbose_name_plural = "Оценки в группах"
    
    def __str__(self):
        return f"{self.from_user.username} → {self.to_user.username} в диалоге {self.dialog.id}: {self.rating}⭐"


class Message(models.Model):
    """Сообщение в диалоге"""
    dialog = models.ForeignKey(Dialog, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_messages')
    text = models.TextField(max_length=2000)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['created_at']
        verbose_name = "Сообщение"
        verbose_name_plural = "Сообщения"
    
    def __str__(self):
        return f"{self.sender.username}: {self.text[:30]}"

class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('message', 'Новое сообщение'),
        ('match', 'Найден собеседник'),
        ('group_join', 'Кто-то присоединился'),
        ('rating', 'Вас оценили'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=200)
    text = models.TextField()
    link = models.CharField(max_length=500, blank=True)  # куда ведёт уведомление
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Уведомление"
        verbose_name_plural = "Уведомления"
    
    def __str__(self):
        return f"{self.user.username}: {self.title}"