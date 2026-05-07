from django.urls import path
from . import views

urlpatterns = [
    path('', views.roulette, name='roulette'),
    path('api/solo/create/', views.create_solo_request, name='create_solo'),
    path('api/solo/find/', views.find_solo_match, name='find_solo'),
    path('api/solo/accept/', views.accept_solo_match, name='accept_solo'),
    path('api/group/create/', views.create_group_request, name='create_group'),
    path('api/group/find/', views.find_group_match, name='find_group'),
    path('api/group/join/<int:group_id>/', views.join_group, name='join_group'),
    path('messages/', views.messages_list, name='messages_list'),
    path('messages/<int:dialog_id>/', views.dialog_detail, name='dialog_detail'),
    path('api/messages/send/<int:dialog_id>/', views.send_message, name='send_message'),
    path('api/messages/unread/', views.get_unread_count, name='unread_count'),
    path('api/messages/new/<int:dialog_id>/', views.get_new_messages, name='new_messages'),
    path('api/dialog/delete/<int:dialog_id>/', views.delete_dialog, name='delete_dialog'),
]