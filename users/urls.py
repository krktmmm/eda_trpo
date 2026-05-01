from django.urls import path
from . import views

urlpatterns = [
    path('profile/', views.profile, name='profile'),
    path('edit/', views.edit_profile, name='edit_profile'),
    path('settings/', views.settings_view, name='settings'),
]