from django.contrib import admin
from .models import Place

@admin.register(Place)
class PlaceAdmin(admin.ModelAdmin):
    list_display = ('name', 'address', 'nearest_building', 'avg_price', 'rating')
    search_fields = ('name', 'address')
    list_filter = ('nearest_building', 'cuisine_type')