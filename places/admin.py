from .models import Place, Review
from django.contrib import admin

@admin.register(Place)
class PlaceAdmin(admin.ModelAdmin):
    list_display = ('name', 'address', 'nearest_building', 'avg_price', 'student_discount', 'rating')
    list_filter = ('nearest_building', 'cuisine_type')
    search_fields = ('name', 'address')

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('place', 'user', 'rating', 'created_at')
    list_filter = ('rating', 'place')
    search_fields = ('user__username', 'place__name', 'text')