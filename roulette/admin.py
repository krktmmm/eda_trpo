from django.contrib import admin
from .models import (
    SoloRequest, GroupRequest, GroupMember, 
    Dialog, Message, Notification, UserRating,
    GroupRatingProgress, GroupUserRating
)


@admin.register(SoloRequest)
class SoloRequestAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'building', 'budget', 'is_active', 'created_at')
    list_filter = ('building', 'budget', 'is_active')
    search_fields = ('user__username',)
    actions = ['activate_requests', 'deactivate_requests']
    
    def activate_requests(self, request, queryset):
        queryset.update(is_active=True)
    activate_requests.short_description = "Активировать выбранные заявки"
    
    def deactivate_requests(self, request, queryset):
        queryset.update(is_active=False)
    deactivate_requests.short_description = "Деактивировать выбранные заявки"


@admin.register(GroupRequest)
class GroupRequestAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'building', 'budget', 'needed_people', 'current_members', 'is_active', 'created_at')
    list_filter = ('building', 'budget', 'is_active')
    search_fields = ('user__username',)
    actions = ['activate_requests', 'deactivate_requests']
    
    def activate_requests(self, request, queryset):
        queryset.update(is_active=True)
    activate_requests.short_description = "Активировать выбранные заявки"
    
    def deactivate_requests(self, request, queryset):
        queryset.update(is_active=False)
    deactivate_requests.short_description = "Деактивировать выбранные заявки"


@admin.register(GroupMember)
class GroupMemberAdmin(admin.ModelAdmin):
    list_display = ('id', 'group', 'user', 'joined_at')
    search_fields = ('user__username', 'group__user__username')


@admin.register(Dialog)
class DialogAdmin(admin.ModelAdmin):
    list_display = ('id', 'display_participants', 'created_at', 'is_meal_completed', 
                    'completed_at', 'is_group_chat', 'messages_count')
    list_filter = ('is_meal_completed', 'is_group_chat', 'created_at', 'completed_at')
    search_fields = ('participants__username',)
    filter_horizontal = ('participants',)
    readonly_fields = ('created_at', 'completed_at', 'messages_count')
    actions = ['mark_meals_completed', 'mark_meals_not_completed']
    
    def display_participants(self, obj):
        return ", ".join([p.username for p in obj.participants.all()])
    display_participants.short_description = "Участники"
    
    def messages_count(self, obj):
        return obj.messages.count()
    messages_count.short_description = "Сообщений"
    
    def mark_meals_completed(self, request, queryset):
        from django.utils import timezone
        updated = queryset.update(is_meal_completed=True, completed_at=timezone.now())
        self.message_user(request, f"Завершено обедов: {updated}")
    mark_meals_completed.short_description = "✅ Завершить выбранные обеды"
    
    def mark_meals_not_completed(self, request, queryset):
        updated = queryset.update(is_meal_completed=False, completed_at=None)
        self.message_user(request, f"Отмечено как активные: {updated}")
    mark_meals_not_completed.short_description = "🔄 Отметить как активные"


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'dialog_id', 'sender', 'text_preview', 'created_at', 'is_read')
    list_filter = ('is_read', 'created_at')
    search_fields = ('sender__username', 'text')
    actions = ['mark_as_read', 'mark_as_unread']
    
    def text_preview(self, obj):
        return obj.text[:50] + '...' if len(obj.text) > 50 else obj.text
    text_preview.short_description = "Текст"
    
    def mark_as_read(self, request, queryset):
        queryset.update(is_read=True)
        self.message_user(request, "Сообщения отмечены как прочитанные")
    mark_as_read.short_description = "📖 Отметить как прочитанные"
    
    def mark_as_unread(self, request, queryset):
        queryset.update(is_read=False)
        self.message_user(request, "Сообщения отмечены как непрочитанные")
    mark_as_unread.short_description = "🔴 Отметить как непрочитанные"


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'type', 'title', 'text_preview', 'is_read', 'created_at')
    list_filter = ('type', 'is_read', 'created_at')
    search_fields = ('user__username', 'title', 'text')
    actions = ['mark_as_read', 'mark_as_unread', 'delete_old_notifications']
    
    def text_preview(self, obj):
        return obj.text[:50] + '...' if len(obj.text) > 50 else obj.text
    text_preview.short_description = "Текст"
    
    def mark_as_read(self, request, queryset):
        queryset.update(is_read=True)
        self.message_user(request, "Уведомления отмечены как прочитанные")
    mark_as_read.short_description = "📖 Отметить как прочитанные"
    
    def mark_as_unread(self, request, queryset):
        queryset.update(is_read=False)
        self.message_user(request, "Уведомления отмечены как непрочитанные")
    mark_as_unread.short_description = "🔴 Отметить как непрочитанные"
    
    def delete_old_notifications(self, request, queryset):
        from django.utils import timezone
        from datetime import timedelta
        old_date = timezone.now() - timedelta(days=30)
        old_notifs = queryset.filter(created_at__lt=old_date)
        count = old_notifs.count()
        old_notifs.delete()
        self.message_user(request, f"Удалено старых уведомлений: {count}")
    delete_old_notifications.short_description = "🗑️ Удалить старые (старше 30 дней)"


@admin.register(UserRating)
class UserRatingAdmin(admin.ModelAdmin):
    list_display = ('id', 'from_user', 'to_user', 'rating', 'created_at')
    list_filter = ('rating', 'created_at')
    search_fields = ('from_user__username', 'to_user__username')


@admin.register(GroupRatingProgress)
class GroupRatingProgressAdmin(admin.ModelAdmin):
    list_display = ('id', 'dialog', 'user', 'current_index', 'rated_count', 'updated_at')
    
    def rated_count(self, obj):
        return obj.rated_users.count()
    rated_count.short_description = "Оценено"


@admin.register(GroupUserRating)
class GroupUserRatingAdmin(admin.ModelAdmin):
    list_display = ('id', 'dialog', 'from_user', 'to_user', 'rating', 'created_at')
    list_filter = ('rating', 'created_at')
    search_fields = ('from_user__username', 'to_user__username')