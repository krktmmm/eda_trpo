from django.urls import path
from . import views

urlpatterns = [
    path('api/solo/create/', views.create_solo_request, name='create_solo'),
    path('api/solo/find/', views.find_solo_match, name='find_solo'),
    path('api/group/create/', views.create_group_request, name='create_group'),
    path('api/group/find/', views.find_group_match, name='find_group'),
    path('api/group/join/<int:group_id>/', views.join_group, name='join_group'),
]