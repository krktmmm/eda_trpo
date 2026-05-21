from django.urls import path
from . import views

urlpatterns = [
    path('', views.profile, name='profile'),
    path('edit/', views.edit_profile, name='edit_profile'),
    path('settings/', views.settings_view, name='settings'),
    path('change-password/', views.change_password, name='change_password'),
    path('delete-avatar/', views.delete_avatar, name='delete_avatar'),
    path('<str:username>/', views.public_profile, name='public_profile'),
]