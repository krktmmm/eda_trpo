from roulette.models import SoloRequest, GroupRequest, GroupMember, Dialog, Message, Notification, UserRating, GroupRatingProgress
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import models
from places.models import Place, Review, Favorite
from .models import FCMToken
from .serializers import *
import random

User = get_user_model()


# ============================================================
# АВТОРИЗАЦИЯ
# ============================================================

@api_view(['POST'])
@permission_classes([AllowAny])
def register_api(request):
    """Регистрация через API"""
    username = request.data.get('username')
    password = request.data.get('password')
    email = request.data.get('email', '')

    if not username or not password:
        return Response({'error': 'Имя пользователя и пароль обязательны'},
                        status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=username).exists():
        return Response({'error': 'Пользователь уже существует'},
                        status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.create_user(username=username, password=password, email=email)
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email
    })


# ============================================================
# ЗАВЕДЕНИЯ
# ============================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def get_places(request):
    """Список всех заведений"""
    places = Place.objects.all().order_by('name')
    serializer = PlaceSerializer(places, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_place_detail(request, place_id):
    """Детали заведения"""
    place = get_object_or_404(Place, id=place_id)
    serializer = PlaceSerializer(place, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def search_places(request):
    """Поиск заведений"""
    query = request.GET.get('q', '').strip()
    if not query:
        return Response([])

    places = Place.objects.filter(name__icontains=query)[:10]
    serializer = PlaceSerializer(places, many=True, context={'request': request})
    return Response(serializer.data)


# ============================================================
# ИЗБРАННОЕ
# ============================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_favorites(request):
    """Список избранных заведений"""
    favorites = Favorite.objects.filter(user=request.user).select_related('place')
    places = [fav.place for fav in favorites]
    serializer = PlaceSerializer(places, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_favorite(request, place_id):
    """Добавить/удалить из избранного"""
    place = get_object_or_404(Place, id=place_id)
    favorite = Favorite.objects.filter(user=request.user, place=place)

    if favorite.exists():
        favorite.delete()
        is_favorited = False
    else:
        Favorite.objects.create(user=request.user, place=place)
        is_favorited = True

    return Response({'is_favorited': is_favorited})


# ============================================================
# ОТЗЫВЫ
# ============================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_review_api(request, place_id):
    """Добавить отзыв"""
    place = get_object_or_404(Place, id=place_id)

    if Review.objects.filter(place=place, user=request.user).exists():
        return Response({'error': 'Вы уже оставляли отзыв'},
                        status=status.HTTP_400_BAD_REQUEST)

    rating = request.data.get('rating')
    text = request.data.get('text', '')

    if not rating:
        return Response({'error': 'Поставьте оценку'},
                        status=status.HTTP_400_BAD_REQUEST)

    review = Review.objects.create(
        place=place,
        user=request.user,
        rating=int(rating),
        text=text
    )

    # Обновляем рейтинг заведения
    all_reviews = place.reviews.all()
    total = sum(r.rating for r in all_reviews)
    place.rating = total / all_reviews.count()
    place.rating_count = all_reviews.count()
    place.save()

    serializer = ReviewSerializer(review)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_review_api(request, review_id):
    """Удалить отзыв"""
    review = get_object_or_404(Review, id=review_id)

    if review.user != request.user:
        return Response({'error': 'Нельзя удалить чужой отзыв'},
                        status=status.HTTP_403_FORBIDDEN)

    place = review.place
    review.delete()

    all_reviews = place.reviews.all()
    if all_reviews.exists():
        total = sum(r.rating for r in all_reviews)
        place.rating = total / all_reviews.count()
        place.rating_count = all_reviews.count()
    else:
        place.rating = 0
        place.rating_count = 0
    place.save()

    return Response({'status': 'ok'})


# ============================================================
# ПРОФИЛЬ
# ============================================================

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def profile_api(request):
    """Получить/обновить профиль"""
    profile = request.user.profile

    if request.method == 'GET':
        serializer = ProfileSerializer(profile)
        return Response(serializer.data)

    serializer = ProfileSerializer(profile, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_profile_api(request, username):
    """Публичный профиль пользователя"""
    user = get_object_or_404(User, username=username)
    serializer = UserSerializer(user)
    return Response(serializer.data)


# ============================================================
# СОЛО-РУЛЕТКА
# ============================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_solo_params_api(request):
    """Сохранить параметры соло-поиска"""
    has_active = Dialog.objects.filter(
        participants=request.user,
        is_meal_completed=False
    ).exists()

    if has_active:
        return Response({
            'error': 'active_meeting',
            'message': 'У вас уже есть активная встреча'
        }, status=status.HTTP_400_BAD_REQUEST)

    data = request.data
    request.session['search_building'] = data.get('building')
    request.session['search_budget'] = data.get('budget', 'any')
    request.session.pop('skipped_match_ids', None)

    return Response({'status': 'ok'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def find_solo_match_api(request):
    """Найти соло-собеседника"""
    building = request.session.get('search_building')
    budget = request.session.get('search_budget', 'any')

    if not building:
        return Response({'error': 'Нет параметров поиска'},
                        status=status.HTTP_400_BAD_REQUEST)

    user_request = SoloRequest.objects.filter(user=request.user, is_active=True).first()
    if not user_request:
        user_request = SoloRequest.objects.create(
            user=request.user,
            building=building,
            budget=budget,
            telegram=request.user.profile.telegram,
            vk=request.user.profile.vk,
            is_active=True
        )

    base_queryset = SoloRequest.objects.filter(is_active=True).exclude(user=request.user)
    candidates = []

    building_order = [building]
    if building == '1':
        building_order.extend(['3', '5'])
    elif building == '3':
        building_order.extend(['1', '5'])
    else:
        building_order.extend(['3', '1'])

    for b in building_order:
        building_candidates = list(base_queryset.filter(building=b))
        if budget == 'any':
            random.shuffle(building_candidates)
            candidates.extend(building_candidates)
        else:
            same_budget = [m for m in building_candidates if m.budget == budget]
            if same_budget:
                candidates.extend(same_budget)
            any_budget = [m for m in building_candidates if m.budget == 'any']
            if any_budget:
                candidates.extend(any_budget)

    if candidates:
        skipped_ids = request.session.get('skipped_match_ids', [])
        available = [m for m in candidates if m.id not in skipped_ids]

        if not available:
            skipped_ids = []
            available = candidates

        match = available[0]
        skipped_ids.append(match.id)
        request.session['skipped_match_ids'] = skipped_ids
        request.session['match_user_id'] = match.user.id
        request.session['match_request_id'] = match.id

        return Response({
            'status': 'found',
            'username': match.user.username,
            'telegram': match.telegram,
            'vk': match.vk,
            'avatar_url': match.user.profile.avatar.url if match.user.profile.avatar else None,
            'building': match.get_building_display(),
            'budget': match.get_budget_display(),
        })

    return Response({
        'status': 'not_found',
        'message': 'Никого не найдено'
    }, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def accept_solo_match_api(request):
    """Принять соло-матч"""
    match_user_id = request.session.get('match_user_id')
    if not match_user_id:
        return Response({'error': 'Нет активного матча'},
                        status=status.HTTP_400_BAD_REQUEST)

    has_active = Dialog.objects.filter(
        participants=request.user,
        is_meal_completed=False
    ).exists()

    if has_active:
        return Response({'error': 'У вас уже есть активная встреча'},
                        status=status.HTTP_400_BAD_REQUEST)

    match_user = get_object_or_404(User, id=match_user_id)
    dialog, _ = Dialog.get_or_create_dialog(request.user, match_user)

    # Отправляем уведомление
    send_push_notification(
        match_user,
        '🎯 Найден собеседник!',
        f'{request.user.username} хочет пойти с вами на обед!',
        {'type': 'match', 'dialog_id': str(dialog.id)}
    )

    SoloRequest.objects.filter(user=match_user, is_active=True).update(is_active=False)
    SoloRequest.objects.filter(user=request.user, is_active=True).update(is_active=False)

    request.session.pop('match_user_id', None)
    request.session.pop('match_request_id', None)
    request.session.pop('skipped_match_ids', None)
    request.session['active_meeting'] = True

    return Response({
        'status': 'ok',
        'dialog_id': dialog.id
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_solo_request_api(request):
    """Отменить соло-заявку"""
    SoloRequest.objects.filter(user=request.user, is_active=True).delete()
    return Response({'status': 'ok'})


# ============================================================
# ГРУППОВАЯ РУЛЕТКА
# ============================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_group_params_api(request):
    """Сохранить параметры группового поиска"""
    has_active = Dialog.objects.filter(
        participants=request.user,
        is_meal_completed=False
    ).exists()

    if has_active:
        return Response({
            'error': 'active_meeting',
            'message': 'У вас уже есть активная встреча'
        }, status=status.HTTP_400_BAD_REQUEST)

    data = request.data
    request.session['search_building'] = data.get('building')
    request.session['search_budget'] = data.get('budget', 'any')
    request.session['search_needed_people'] = data.get('needed_people')
    request.session.pop('skipped_group_ids', None)

    return Response({'status': 'ok'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def find_group_match_api(request):
    """Найти группу"""
    building = request.session.get('search_building')
    budget = request.session.get('search_budget', 'any')
    needed_people = request.session.get('search_needed_people')

    if not building:
        return Response({'error': 'Нет параметров поиска'},
                        status=status.HTTP_400_BAD_REQUEST)

    user_request = GroupRequest.objects.filter(user=request.user, is_active=True).first()
    if not user_request:
        user_request = GroupRequest.objects.create(
            user=request.user,
            building=building,
            budget=budget,
            needed_people=int(needed_people) if needed_people else 3,
            telegram=request.user.profile.telegram,
            vk=request.user.profile.vk,
            is_active=True
        )
        GroupMember.objects.create(group=user_request, user=request.user)

    base_queryset = GroupRequest.objects.filter(
        is_active=True,
        current_members__lt=models.F('needed_people')
    ).exclude(user=request.user)

    if needed_people and int(needed_people) > 2:
        base_queryset = base_queryset.filter(needed_people=int(needed_people))

    building_order = [building]
    if building == '1':
        building_order.extend(['3', '5'])
    elif building == '3':
        building_order.extend(['1', '5'])
    else:
        building_order.extend(['3', '1'])

    candidates = []
    for b in building_order:
        building_groups = list(base_queryset.filter(building=b))
        if budget == 'any':
            random.shuffle(building_groups)
            candidates.extend(building_groups)
        else:
            same_budget = [g for g in building_groups if g.budget == budget]
            if same_budget:
                candidates.extend(same_budget)
            any_budget = [g for g in building_groups if g.budget == 'any']
            if any_budget:
                candidates.extend(any_budget)

    if candidates:
        skipped_ids = request.session.get('skipped_group_ids', [])
        available = [g for g in candidates if g.id not in skipped_ids]

        if not available:
            skipped_ids = []
            available = candidates

        group = available[0]
        skipped_ids.append(group.id)
        request.session['skipped_group_ids'] = skipped_ids
        request.session['match_group_id'] = group.id

        members = GroupMember.objects.filter(group=group).select_related('user', 'user__profile')
        members_data = []
        for member in members:
            members_data.append({
                'username': member.user.username,
                'telegram': member.user.profile.telegram or '—',
                'vk': member.user.profile.vk or '—',
                'avatar_url': member.user.profile.avatar.url if member.user.profile.avatar else None,
            })

        slots_left = group.needed_people - group.current_members

        return Response({
            'status': 'found',
            'group_id': group.id,
            'dialog_id': group.dialog.id if group.dialog else None,
            'building': group.get_building_display(),
            'budget': group.get_budget_display(),
            'needed_people': group.needed_people,
            'current_members': group.current_members,
            'slots_left': slots_left,
            'members': members_data,
            'is_almost_full': slots_left == 1,
        })

    return Response({
        'status': 'waiting',
        'message': 'Пока никто не ищет компанию',
        'your_group_id': user_request.id,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_company_api(request):
    """Создать компанию и чат"""
    try:
        data = request.data
        size = int(data.get('size', 3))

        group = GroupRequest.objects.filter(
            user=request.user,
            is_active=True
        ).first()

        if not group:
            profile = request.user.profile
            group = GroupRequest.objects.create(
                user=request.user,
                building=request.session.get('search_building', '1'),
                budget=request.session.get('search_budget', 'any'),
                needed_people=size,
                telegram=profile.telegram or '',
                vk=profile.vk or '',
                is_active=True
            )
            GroupMember.objects.create(group=group, user=request.user)

        group.needed_people = size
        group.save()

        if not group.dialog:
            dialog = Dialog.objects.create(is_group_chat=True)
            dialog.participants.add(request.user)
            group.dialog = dialog
            group.save()

            Message.objects.create(
                dialog=dialog,
                sender=request.user,
                text=f'[system] 🎉 Компания создана! {request.user.username} ищет компанию из {size} человек!'
            )

        return Response({
            'status': 'ok',
            'dialog_id': group.dialog.id
        })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def join_group_api(request, group_id):
    """Присоединиться к группе"""
    try:
        group = get_object_or_404(GroupRequest, id=group_id, is_active=True)

        if GroupMember.objects.filter(group=group, user=request.user).exists():
            return Response({'error': 'Вы уже в этой группе'},
                            status=status.HTTP_400_BAD_REQUEST)

        if group.current_members >= group.needed_people:
            return Response({'error': 'Группа уже заполнена'},
                            status=status.HTTP_400_BAD_REQUEST)

        if not group.dialog:
            dialog = Dialog.objects.create(is_group_chat=True)
            existing_members = GroupMember.objects.filter(group=group).values_list('user', flat=True)
            for user_id in existing_members:
                dialog.participants.add(user_id)
            dialog.participants.add(request.user)
            group.dialog = dialog
            group.save()
        else:
            group.dialog.participants.add(request.user)

        send_push_notification(
            group.user,
            '👥 Новый участник!',
            f'{request.user.username} присоединился к вашей компании',
            {'type': 'group_join', 'dialog_id': str(group.dialog.id)}
        )

        GroupMember.objects.create(group=group, user=request.user)
        group.current_members += 1
        group.save()

        GroupRequest.objects.filter(user=request.user, is_active=True).update(is_active=False)

        is_full = group.current_members >= group.needed_people

        if is_full:
            group.is_active = False
            group.save()

            for member in GroupMember.objects.filter(group=group):
                if member.user != request.user:
                    send_push_notification(
                        member.user,
                        '🎉 Компания собрана!',
                        'Все участники в сборе, приятного обеда!',
                        {'type': 'group_full', 'dialog_id': str(group.dialog.id)}
                    )

        return Response({
            'status': 'ok',
            'current_members': group.current_members,
            'dialog_id': group.dialog.id,
            'is_full': is_full,
            'slots_left': group.needed_people - group.current_members,
        })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_group_request_api(request):
    """Отменить групповую заявку"""
    group = GroupRequest.objects.filter(user=request.user, is_active=True).first()
    if group:
        GroupMember.objects.filter(group=group).delete()
        group.delete()
    return Response({'status': 'ok'})


# ============================================================
# ЧАТ
# ============================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_dialogs_api(request):
    """Получить список диалогов"""
    dialog_ids = set(
        Dialog.objects.filter(participants=request.user).values_list('id', flat=True)
    )
    all_dialogs = Dialog.objects.filter(id__in=dialog_ids)

    def get_last_message_time(dialog):
        last_msg = dialog.messages.last()
        return last_msg.created_at if last_msg else dialog.created_at

    sorted_dialogs = sorted(all_dialogs, key=get_last_message_time, reverse=True)

    dialogs_data = []
    for dialog in sorted_dialogs:
        last_message = dialog.messages.last()
        unread_count = dialog.messages.filter(is_read=False).exclude(sender=request.user).count()
        other_users = dialog.participants.exclude(id=request.user.id)

        if dialog.is_group_chat or other_users.count() > 1:
            chat_name = 'Группа'
        else:
            other_user = other_users.first()
            chat_name = other_user.username if other_user else 'Чат'

        dialogs_data.append({
            'id': dialog.id,
            'chat_name': chat_name,
            'last_message': {
                'text': last_message.text if last_message else None,
                'sender': last_message.sender.username if last_message else None,
                'created_at': last_message.created_at.isoformat() if last_message else None,
            } if last_message else None,
            'unread_count': unread_count,
            'is_group': dialog.is_group_chat or other_users.count() > 1,
            'other_user_id': other_users.first().id if other_users.count() == 1 else None,
            'is_meal_completed': dialog.is_meal_completed,
        })

    return Response(dialogs_data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_dialog_messages_api(request, dialog_id):
    """Получить сообщения из диалога"""
    dialog = get_object_or_404(Dialog, id=dialog_id)

    if request.user not in dialog.participants.all():
        return Response({'error': 'Доступ запрещен'}, status=status.HTTP_403_FORBIDDEN)

    dialog.messages.filter(is_read=False).exclude(sender=request.user).update(is_read=True)

    messages = dialog.messages.all().order_by('created_at')

    messages_data = []
    for msg in messages:
        messages_data.append({
            'id': msg.id,
            'sender': msg.sender.username,
            'sender_id': msg.sender.id,
            'text': msg.text,
            'is_system': msg.text.startswith('[system]'),
            'is_mine': msg.sender == request.user,
            'created_at': msg.created_at.isoformat(),
        })

    participants = []
    for p in dialog.participants.all():
        avatar_url = p.profile.avatar.url if p.profile.avatar else None
        participants.append({
            'id': p.id,
            'username': p.username,
            'avatar_url': avatar_url,
        })

    return Response({
        'id': dialog.id,
        'messages': messages_data,
        'participants': participants,
        'is_group': dialog.is_group_chat or dialog.participants.count() > 2,
        'is_meal_completed': dialog.is_meal_completed,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_message_api(request, dialog_id):
    """Отправить сообщение"""
    try:
        data = request.data
        text = data.get('text', '').strip()

        if not text:
            return Response({'error': 'Пустое сообщение'},
                            status=status.HTTP_400_BAD_REQUEST)

        dialog = get_object_or_404(Dialog, id=dialog_id)

        if request.user not in dialog.participants.all():
            return Response({'error': 'Доступ запрещен'},
                            status=status.HTTP_403_FORBIDDEN)

        for participant in dialog.participants.exclude(id=request.user.id):
            send_push_notification(
                participant,
                f'💬 {request.user.username}',
                text[:100],
                {'type': 'message', 'dialog_id': str(dialog_id)}
            )

        message = Message.objects.create(
            dialog=dialog,
            sender=request.user,
            text=text
        )

        return Response({
            'status': 'ok',
            'message_id': message.id,
            'text': message.text,
            'created_at': message.created_at.isoformat(),
            'sender': request.user.username
        })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def delete_dialog_api(request, dialog_id):
    """Удалить диалог"""
    dialog = get_object_or_404(Dialog, id=dialog_id)

    if request.user not in dialog.participants.all():
        return Response({'error': 'Доступ запрещен'},
                        status=status.HTTP_403_FORBIDDEN)

    dialog.participants.remove(request.user)

    if dialog.participants.count() == 0:
        dialog.delete()

    request.session.pop('active_meeting', None)

    return Response({'status': 'ok'})


# ============================================================
# УВЕДОМЛЕНИЯ (PUSH)
# ============================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def register_fcm_token(request):
    """Регистрация FCM токена для пуш-уведомлений"""
    token = request.data.get('token')
    device_type = request.data.get('device_type', 'android')

    if not token:
        return Response({'error': 'Token обязателен'},
                        status=status.HTTP_400_BAD_REQUEST)

    FCMToken.objects.update_or_create(
        user=request.user,
        token=token,
        defaults={'device_type': device_type}
    )

    return Response({'status': 'ok'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_notifications_api(request):
    """Получить уведомления"""
    notifications = Notification.objects.filter(
        user=request.user,
        is_read=False
    ).order_by('-created_at')[:20]

    data = [{
        'id': n.id,
        'type': n.type,
        'title': n.title,
        'text': n.text,
        'link': n.link,
        'created_at': n.created_at.isoformat(),
        'is_read': n.is_read,
    } for n in notifications]

    return Response({
        'notifications': data,
        'unread_count': notifications.count()
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_notification_read_api(request, notif_id):
    """Отметить уведомление как прочитанное"""
    notification = get_object_or_404(Notification, id=notif_id, user=request.user)
    notification.is_read = True
    notification.save()
    return Response({'status': 'ok'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_notifications_read_api(request):
    """Отметить все уведомления как прочитанные"""
    Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
    return Response({'status': 'ok'})


def send_push_notification(user, title, body, data={}):
    """Отправить пуш-уведомление пользователю"""
    try:
        from firebase_admin import messaging
        fcm_tokens = FCMToken.objects.filter(user=user)
        if not fcm_tokens.exists():
            return

        for fcm in fcm_tokens:
            message = messaging.Message(
                notification=messaging.Notification(
                    title=title,
                    body=body
                ),
                data=data,
                token=fcm.token
            )
            messaging.send(message)
    except Exception as e:
        print(f"Ошибка отправки уведомления: {e}")


# ============================================================
# ОЦЕНКА ПОЛЬЗОВАТЕЛЕЙ
# ============================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def rate_user_api(request, user_id):
    """Оценить пользователя"""
    to_user = get_object_or_404(User, id=user_id)

    if to_user == request.user:
        return Response({'error': 'Нельзя оценить себя'},
                        status=status.HTTP_400_BAD_REQUEST)

    rating = request.data.get('rating')
    text = request.data.get('text', '')

    if not rating:
        return Response({'error': 'Оценка обязательна'},
                        status=status.HTTP_400_BAD_REQUEST)

    UserRating.objects.create(
        from_user=request.user,
        to_user=to_user,
        rating=int(rating),
        text=text
    )

    all_ratings = UserRating.objects.filter(to_user=to_user)
    total = sum(r.rating for r in all_ratings)
    count = all_ratings.count()
    to_user.profile.rating = total / count if count > 0 else 0
    to_user.profile.rating_count = count
    to_user.profile.save()

    request.session.pop('active_meeting', None)

    return Response({'status': 'ok'})


# ============================================================
# ЗАВЕРШЕНИЕ ОБЕДА
# ============================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_meal_api(request, dialog_id):
    """Завершить обед"""
    dialog = get_object_or_404(Dialog, id=dialog_id)

    if request.user not in dialog.participants.all():
        return Response({'error': 'Доступ запрещен'},
                        status=status.HTTP_403_FORBIDDEN)

    if dialog.is_meal_completed:
        return Response({'error': 'Обед уже завершён'},
                        status=status.HTTP_400_BAD_REQUEST)

    dialog.is_meal_completed = True
    dialog.completed_by = request.user
    dialog.completed_at = timezone.now()
    dialog.save()

    request.session.pop('active_meeting', None)

    Message.objects.create(
        dialog=dialog,
        sender=request.user,
        text='[system] 🍽️ Обед завершён!'
    )

    return Response({'status': 'ok'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_dialog_status_api(request, dialog_id):
    """Проверить статус диалога"""
    dialog = get_object_or_404(Dialog, id=dialog_id)

    if request.user not in dialog.participants.all():
        return Response({'error': 'Доступ запрещен'},
                        status=status.HTTP_403_FORBIDDEN)

    if dialog.participants.count() == 2:
        other_user = dialog.participants.exclude(id=request.user.id).first()
        has_rated = UserRating.objects.filter(
            from_user=request.user,
            to_user=other_user
        ).exists()

        return Response({
            'is_meal_completed': dialog.is_meal_completed,
            'has_rated': has_rated,
            'other_user_id': other_user.id if other_user else None,
            'is_group': False
        })
    else:
        progress, created = GroupRatingProgress.objects.get_or_create(
            dialog=dialog,
            user=request.user
        )
        participants = list(dialog.participants.exclude(id=request.user.id))
        total_count = len(participants)
        rated_count = progress.rated_users.count()
        all_rated = rated_count >= total_count

        return Response({
            'is_meal_completed': dialog.is_meal_completed,
            'has_rated': all_rated,
            'is_group': True,
            'total_participants': total_count,
            'rated_count': rated_count
        })