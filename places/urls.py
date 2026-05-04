from django.urls import path
from . import views

urlpatterns = [
    path('', views.main_menu, name='main_menu'),
    path('places/', views.place_list, name='place_list'),
    path('roulette/', views.roulette, name='roulette'),
    path('place/<int:place_id>/', views.place_detail, name='place_detail'),
    path('place/<int:place_id>/review/', views.add_review, name='add_review'),
    path('favorites/', views.favorites_list, name='favorites_list'),
    path('favorites/toggle/<int:place_id>/', views.toggle_favorite, name='toggle_favorite'),
]