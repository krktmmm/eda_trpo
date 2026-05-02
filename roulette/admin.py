from django.contrib import admin
from .models import SoloRequest, GroupRequest, GroupMember

@admin.register(SoloRequest)
class SoloRequestAdmin(admin.ModelAdmin):
    list_display = ('user', 'building', 'budget', 'is_active', 'created_at')
    list_filter = ('building', 'budget', 'is_active')
    search_fields = ('user__username',)

@admin.register(GroupRequest)
class GroupRequestAdmin(admin.ModelAdmin):
    list_display = ('user', 'building', 'budget', 'needed_people', 'current_members', 'is_active')
    list_filter = ('building', 'budget', 'is_active')
    search_fields = ('user__username',)

@admin.register(GroupMember)
class GroupMemberAdmin(admin.ModelAdmin):
    list_display = ('group', 'user', 'joined_at')