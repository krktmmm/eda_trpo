from django.urls import path
from . import views

urlpatterns = [
    path('', views.place_list, name='place_list'),
    path('place/<int:place_id>/', views.place_detail, name='place_detail'),
    path('place/<int:place_id>/review/', views.add_review, name='add_review'),
]