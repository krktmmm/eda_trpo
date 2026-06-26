from django.urls import path
from . import views

urlpatterns = [
    # ===== АВТОРИЗАЦИЯ =====
    path('auth/register/', views.register_api, name='api_register'),
    
    # ===== ЗАВЕДЕНИЯ =====
    path('places/', views.get_places, name='api_places'),
    path('places/<int:place_id>/', views.get_place_detail, name='api_place_detail'),
    path('places/search/', views.search_places, name='api_search_places'),
    
    # ===== ИЗБРАННОЕ =====
    path('favorites/', views.get_favorites, name='api_favorites'),
    path('favorites/toggle/<int:place_id>/', views.toggle_favorite, name='api_toggle_favorite'),
    
    # ===== ОТЗЫВЫ =====
    path('reviews/add/<int:place_id>/', views.add_review_api, name='api_add_review'),
    path('reviews/delete/<int:review_id>/', views.delete_review_api, name='api_delete_review'),
    
    # ===== ПРОФИЛЬ =====
    path('profile/', views.profile_api, name='api_profile'),
    path('profile/<str:username>/', views.public_profile_api, name='api_public_profile'),
    
    # ===== СОЛО-РУЛЕТКА =====
    path('roulette/solo/save-params/', views.save_solo_params_api, name='api_solo_save'),
    path('roulette/solo/find/', views.find_solo_match_api, name='api_solo_find'),
    path('roulette/solo/accept/', views.accept_solo_match_api, name='api_solo_accept'),
    path('roulette/solo/cancel/', views.cancel_solo_request_api, name='api_solo_cancel'),
    
    # ===== ГРУППОВАЯ РУЛЕТКА =====
    path('roulette/group/save-params/', views.save_group_params_api, name='api_group_save'),
    path('roulette/group/find/', views.find_group_match_api, name='api_group_find'),
    path('roulette/group/create-company/', views.create_company_api, name='api_group_create'),
    path('roulette/group/join/<int:group_id>/', views.join_group_api, name='api_group_join'),
    path('roulette/group/cancel/', views.cancel_group_request_api, name='api_group_cancel'),
    
    # ===== ЧАТ =====
    path('messages/', views.get_dialogs_api, name='api_dialogs'),
    path('messages/<int:dialog_id>/', views.get_dialog_messages_api, name='api_dialog_messages'),
    path('messages/send/<int:dialog_id>/', views.send_message_api, name='api_send_message'),
    path('messages/delete/<int:dialog_id>/', views.delete_dialog_api, name='api_delete_dialog'),
    
    # ===== УВЕДОМЛЕНИЯ =====
    path('notifications/', views.get_notifications_api, name='api_notifications'),
    path('notifications/mark-read/<int:notif_id>/', views.mark_notification_read_api, name='api_notif_read'),
    path('notifications/mark-all-read/', views.mark_all_notifications_read_api, name='api_notif_read_all'),
    
    # ===== ОЦЕНКА =====
    path('rate/<int:user_id>/', views.rate_user_api, name='api_rate_user'),
    
    # ===== ЗАВЕРШЕНИЕ ОБЕДА =====
    path('dialog/complete/<int:dialog_id>/', views.complete_meal_api, name='api_complete_meal'),
    path('dialog/status/<int:dialog_id>/', views.check_dialog_status_api, name='api_dialog_status'),
]