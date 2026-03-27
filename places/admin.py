from django.contrib import admin
from .models import Place, Review

@admin.register(Place)
class PlaceAdmin(admin.ModelAdmin):
    list_display = ('name', 'address', 'nearest_building', 'avg_price', 'rating')
    search_fields = ('name', 'address')
    list_filter = ('nearest_building', 'cuisine_type')

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('place', 'user', 'rating', 'created_at')
    list_filter = ('rating', 'place')
    search_fields = ('user__username', 'place__name', 'text')