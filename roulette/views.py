from .models import SoloRequest, GroupRequest, GroupMember, Dialog, Message, UserRating, GroupRatingProgress, GroupUserRating
from django.shortcuts import render, get_object_or_404, redirect
from django.views.decorators.http import require_http_methods
from django.http import JsonResponse, HttpResponseForbidden
from django.contrib.auth.decorators import login_required
from django.contrib.auth import get_user_model
from django.core.paginator import Paginator
from django.utils import timezone
from django.db import models
import random
import json

@login_required
def roulette(request):
    # Проверяем, есть ли активная встреча
    has_active_meeting = request.session.get('active_meeting', False)
    return render(request, 'roulette/roulette.html', {
        'has_active_meeting': has_active_meeting
    })

def get_nearby_buildings(building):
    nearby_map = {
        '1': ['3'],
        '3': ['1', '5'],
        '5': ['3']
    }
    return nearby_map.get(building, [])

def get_building_order(user_building):
    nearby = get_nearby_buildings(user_building)
    all_buildings = ['1', '3', '5']
    building_order = [user_building]
    for b in nearby:
        building_order.append(b)
    for b in all_buildings:
        if b not in building_order:
            building_order.append(b)
    return building_order

# ==================== СОЛО ====================

@login_required
@require_http_methods(["POST"])
def save_solo_params(request):
    """Сохраняет параметры поиска в сессию (без создания заявки)"""
    if request.session.get('active_meeting'):
        return JsonResponse({
            'error': 'active_meeting',
            'message': 'У вас уже есть активная встреча. Завершите её в чате, чтобы начать новый поиск.'
        }, status=400)
    data = json.loads(request.body)

    # Очищаем старые параметры
    request.session.pop('search_building', None)
    request.session.pop('search_budget', None)
    request.session.pop('skipped_match_ids', None)

    request.session['search_building'] = data.get('building')
    request.session['search_budget'] = data.get('budget', 'any')
    return JsonResponse({'status': 'ok'})

@login_required
@require_http_methods(["POST"])
def create_solo_request(request):
    try:
        data = json.loads(request.body)
        building = data.get('building')
        budget = data.get('budget', 'any')
        profile = request.user.profile
        
        # Деактивируем старые заявки
        SoloRequest.objects.filter(user=request.user, is_active=True).update(is_active=False)
        
        solo = SoloRequest.objects.create(
            user=request.user,
            building=building,
            budget=budget,
            telegram=profile.telegram,
            vk=profile.vk,
            is_active=True
        )
        return JsonResponse({'status': 'ok', 'id': solo.id})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@login_required
@require_http_methods(["GET"])
def find_solo_match(request):
    building = request.session.get('search_building')
    budget = request.session.get('search_budget', 'any')
    
    if not building:
        return JsonResponse({'error': 'Нет параметров поиска'}, status=404)
    
    profile = request.user.profile
    
    # Убеждаемся, что у пользователя есть активная заявка
    user_request = SoloRequest.objects.filter(user=request.user, is_active=True).first()
    if not user_request:
        user_request = SoloRequest.objects.create(
            user=request.user,
            building=building,
            budget=budget,
            telegram=profile.telegram,
            vk=profile.vk,
            is_active=True
        )
    
    base_queryset = SoloRequest.objects.filter(is_active=True).exclude(user=request.user)
    candidates = []
    
    building_order = get_building_order(building)
    
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
        
        avatar_url = None
        if hasattr(match.user, 'profile') and match.user.profile.avatar:
            avatar_url = match.user.profile.avatar.url
        
        return JsonResponse({
            'status': 'found',
            'username': match.user.username,
            'telegram': match.telegram,
            'vk': match.vk,
            'avatar_url': avatar_url,
            'building': match.get_building_display(),
            'budget': match.get_budget_display(),
            'match_type': 'match',
            'group_id': None,
        })
    
    return JsonResponse({'status': 'not_found', 'message': 'Никого не найдено'}, status=404)

@login_required
@require_http_methods(["POST"])
def accept_solo_match(request):
    match_user_id = request.session.get('match_user_id')
    if not match_user_id:
        return JsonResponse({'error': 'Нет активного матча'}, status=404)
    
    User = get_user_model()
    match_user = get_object_or_404(User, id=match_user_id)
    
    SoloRequest.objects.filter(user=match_user, is_active=True).update(is_active=False)
    SoloRequest.objects.filter(user=request.user, is_active=True).update(is_active=False)
    
    dialog, created = Dialog.get_or_create_dialog(request.user, match_user)
    request.session['active_meeting'] = True
    
    request.session.pop('match_user_id', None)
    request.session.pop('match_request_id', None)
    request.session.pop('skipped_match_ids', None)
    
    return JsonResponse({'status': 'ok', 'dialog_id': dialog.id})

# ==================== ГРУППА ====================

@login_required
@require_http_methods(["POST"])
def save_group_params(request):
    """Сохраняет параметры поиска группы в сессию"""
    if request.session.get('active_meeting'):
        return JsonResponse({
            'error': 'active_meeting',
            'message': 'У вас уже есть активная встреча. Завершите её в чате, чтобы начать новый поиск.'
        }, status=400)
    data = json.loads(request.body)

    # Очищаем старые параметры
    request.session.pop('search_building', None)
    request.session.pop('search_budget', None)
    request.session.pop('search_needed_people', None)
    request.session.pop('skipped_group_ids', None)

    request.session['search_building'] = data.get('building')
    request.session['search_budget'] = data.get('budget', 'any')
    request.session['search_needed_people'] = data.get('needed_people')
    return JsonResponse({'status': 'ok'})

@login_required
@require_http_methods(["POST"])
def create_group_request(request):
    try:
        data = json.loads(request.body)
        building = data.get('building')
        budget = data.get('budget', 'any')
        needed_people_raw = data.get('needed_people')
        profile = request.user.profile
        
        needed_people = int(needed_people_raw) if needed_people_raw else None
        
        existing = GroupRequest.objects.filter(
            user=request.user,
            is_active=True
        ).first()
        
        if existing:
            return JsonResponse({
                'status': 'ok',
                'id': existing.id,
                'dialog_id': existing.dialog.id if existing.dialog else None
            })
        
        GroupRequest.objects.filter(user=request.user, is_active=True).update(is_active=False)
        
        group = GroupRequest.objects.create(
            user=request.user,
            building=building,
            budget=budget,
            needed_people=needed_people if needed_people else 3,
            telegram=profile.telegram,
            vk=profile.vk,
            is_active=True
        )
        GroupMember.objects.create(group=group, user=request.user)
        
        return JsonResponse({
            'status': 'ok',
            'id': group.id,
            'dialog_id': None
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@login_required
@require_http_methods(["POST"])
def create_company(request):
    """Создать компанию и чат"""
    try:
        data = json.loads(request.body)
        size = int(data.get('size', 3))
        
        group = GroupRequest.objects.filter(
            user=request.user,
            is_active=True
        ).first()
        
        if not group:
            return JsonResponse({'error': 'Нет активной заявки'}, status=404)
        
        group.needed_people = size
        group.save()
        
        if not group.dialog:
            dialog = Dialog.objects.create()
            dialog.participants.add(request.user)
            group.dialog = dialog
            group.save()
            
            Message.objects.create(
                dialog=dialog,
                sender=request.user,
                text=f'[system] 🎉 Компания создана! {request.user.username} ищет компанию из {size} человек!'
            )
        
        return JsonResponse({
            'status': 'ok',
            'dialog_id': group.dialog.id
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@login_required
@require_http_methods(["GET"])
def find_group_match(request):
    building = request.session.get('search_building')
    budget = request.session.get('search_budget', 'any')
    needed_people_raw = request.session.get('search_needed_people')
    
    if not building:
        return JsonResponse({'error': 'Нет параметров поиска'}, status=404)
    
    profile = request.user.profile
    needed_people = int(needed_people_raw) if needed_people_raw else None
    
    # Убеждаемся, что у пользователя есть активная заявка
    user_request = GroupRequest.objects.filter(user=request.user, is_active=True).first()
    if not user_request:
        user_request = GroupRequest.objects.create(
            user=request.user,
            building=building,
            budget=budget,
            needed_people=needed_people if needed_people else 3,
            telegram=profile.telegram,
            vk=profile.vk,
            is_active=True
        )
        GroupMember.objects.create(group=user_request, user=request.user)
    
    base_queryset = GroupRequest.objects.filter(
        is_active=True,
        current_members__lt=models.F('needed_people')
    ).exclude(user=request.user)
    
    if needed_people and needed_people > 2:
        base_queryset = base_queryset.filter(needed_people=needed_people)
    
    candidates = []
    building_order = get_building_order(building)
    
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
            avatar_url = None
            if member.user.profile.avatar:
                avatar_url = member.user.profile.avatar.url

            members_data.append({
                'username': member.user.username,
                'telegram': member.user.profile.telegram or '—',
                'vk': member.user.profile.vk or '—',
                'avatar_url': avatar_url,
            })
        
        slots_left = group.needed_people - group.current_members
        
        return JsonResponse({
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
    
    return JsonResponse({
        'status': 'waiting',
        'message': 'Пока никто не ищет компанию. Вы первый!',
        'your_group_id': user_request.id,
    })

@login_required
@require_http_methods(["POST"])
def join_group(request, group_id):
    group = get_object_or_404(GroupRequest, id=group_id, is_active=True)
    
    if GroupMember.objects.filter(group=group, user=request.user).exists():
        return JsonResponse({'error': 'Вы уже в этой группе'}, status=400)
    
    if group.current_members >= group.needed_people:
        return JsonResponse({'error': 'Группа уже заполнена'}, status=400)
    
    request.session['active_meeting'] = True
    
    if not group.dialog:
        dialog = Dialog.objects.create()
        existing_members = GroupMember.objects.filter(group=group).values_list('user', flat=True)
        for user_id in existing_members:
            dialog.participants.add(user_id)
        dialog.participants.add(request.user)
        group.dialog = dialog
        group.save()
        
        Message.objects.create(
            dialog=dialog,
            sender=request.user,
            text=f'[system] Чат создан! {request.user.username} присоединился к компании! ({group.current_members + 1}/{group.needed_people})'
        )
    else:
        group.dialog.participants.add(request.user)
        
        Message.objects.create(
            dialog=group.dialog,
            sender=request.user,
            text=f'[system] {request.user.username} присоединился к компании! ({group.current_members + 1}/{group.needed_people})'
        )
    
    GroupRequest.objects.filter(user=request.user, is_active=True).update(is_active=False)
    GroupMember.objects.create(group=group, user=request.user)
    group.current_members += 1
    
    is_full = group.current_members >= group.needed_people
    
    if is_full:
        group.is_active = False
        all_members = GroupMember.objects.filter(group=group).values_list('user', flat=True)
        GroupRequest.objects.filter(user__in=all_members, is_active=True).update(is_active=False)
        
        Message.objects.create(
            dialog=group.dialog,
            sender=request.user,
            text=f'[system] 🎉 Группа собрана! Всем приятного обеда!'
        )
    
    group.save()
    
    return JsonResponse({
        'status': 'ok',
        'current_members': group.current_members,
        'dialog_id': group.dialog.id,
        'is_full': is_full,
        'slots_left': group.needed_people - group.current_members,
    })

@login_required
def rate_user(request, user_id):
    """Страница оценки пользователя после встречи"""
    User = get_user_model()
    to_user = get_object_or_404(User, id=user_id)
    
    if to_user == request.user:
        return redirect('/')
    
    if request.method == 'POST':
        rating = request.POST.get('rating')
        text = request.POST.get('text', '')
        photo_url = request.POST.get('photo_url', '')
        
        if rating:
            UserRating.objects.create(
                from_user=request.user,
                to_user=to_user,
                rating=int(rating),
                text=text,
                photo_url=photo_url
            )
            
            # Обновляем рейтинг пользователя
            all_ratings = UserRating.objects.filter(to_user=to_user)
            total = sum(r.rating for r in all_ratings)
            count = all_ratings.count()
            to_user.profile.rating = total / count if count > 0 else 0
            to_user.profile.rating_count = count
            to_user.profile.save()
            
            # Завершаем встречу — разрешаем новый поиск
            request.session.pop('active_meeting', None)
            
            return redirect('/roulette/')
    
    return render(request, 'roulette/rate_user.html', {
        'to_user': to_user,
        'stars_range': range(1, 6),
    })

# ==================== ЛИЧНЫЕ СООБЩЕНИЯ ====================

@login_required
def messages_list(request):
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
        
        if other_users.count() > 1:
            chat_name = f'Группа ({dialog.participants.count()} чел.)'
        else:
            other_user = other_users.first()
            chat_name = other_user.username if other_user else 'Чат'
        
        dialogs_data.append({
            'dialog': dialog,
            'last_message': last_message,
            'unread_count': unread_count,
            'chat_name': chat_name,
            'is_group': other_users.count() > 1,
            'other_user': other_users.first() if other_users.count() == 1 else None,
        })
    
    return render(request, 'roulette/messages.html', {'dialogs': dialogs_data})

@login_required
def dialog_detail(request, dialog_id):
    dialog = get_object_or_404(Dialog, id=dialog_id)
    
    if request.user not in dialog.participants.all():
        return HttpResponseForbidden("Вы не участник этого диалога")
    
    dialog.messages.filter(is_read=False).exclude(sender=request.user).update(is_read=True)
    
    messages_list = dialog.messages.all()
    paginator = Paginator(messages_list, 20)
    page_number = request.GET.get('page', 1)
    messages = paginator.get_page(page_number)
    
    other_users = dialog.participants.exclude(id=request.user.id)
    other_user = other_users.first()
    is_group = other_users.count() > 1
    
    return render(request, 'roulette/dialog.html', {
        'dialog': dialog,
        'messages': messages,
        'other_user': other_user,
        'is_group': is_group,
        'participants': dialog.participants.all(),
    })

@login_required
@require_http_methods(["POST"])
def send_message(request, dialog_id):
    try:
        data = json.loads(request.body)
        text = data.get('text', '').strip()
        
        if not text:
            return JsonResponse({'error': 'Пустое сообщение'}, status=400)
        
        dialog = get_object_or_404(Dialog, id=dialog_id)
        
        if request.user not in dialog.participants.all():
            return JsonResponse({'error': 'Доступ запрещен'}, status=403)
        
        message = Message.objects.create(
            dialog=dialog,
            sender=request.user,
            text=text
        )
        
        return JsonResponse({
            'status': 'ok',
            'message_id': message.id,
            'text': message.text,
            'created_at': timezone.localtime(message.created_at).strftime('%H:%M'),
            'sender': request.user.username
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@login_required
@require_http_methods(["GET"])
def get_unread_count(request):
    dialogs = request.user.dialogs.all()
    unread_total = 0
    for dialog in dialogs:
        unread_total += dialog.messages.filter(is_read=False).exclude(sender=request.user).count()
    return JsonResponse({'unread_count': unread_total})

@login_required
@require_http_methods(["GET"])
def get_new_messages(request, dialog_id):
    after_id = request.GET.get('after_id')
    dialog = get_object_or_404(Dialog, id=dialog_id)
    
    if request.user not in dialog.participants.all():
        return JsonResponse({'error': 'Доступ запрещен'}, status=403)
    
    messages = dialog.messages.all()
    if after_id:
        messages = messages.filter(id__gt=after_id)
    
    messages.filter(is_read=False).exclude(sender=request.user).update(is_read=True)
    
    data = [{
        'id': m.id,
        'sender': m.sender.username,
        'text': m.text,
        'created_at': timezone.localtime(m.created_at).strftime('%H:%M'),
        'is_mine': m.sender == request.user
    } for m in messages]
    
    return JsonResponse({'messages': data})

@login_required
@require_http_methods(["POST"])
def delete_dialog(request, dialog_id):
    dialog = get_object_or_404(Dialog, id=dialog_id)
    if request.user not in dialog.participants.all():
        return JsonResponse({'error': 'Доступ запрещен'}, status=403)
    dialog.delete()
    return JsonResponse({'status': 'ok'})

# ==================== УПРАВЛЕНИЕ ЗАЯВКАМИ ====================

@login_required
@require_http_methods(["POST"])
def cancel_solo_request(request):
    """Полностью удаляет активную соло-заявку пользователя"""
    SoloRequest.objects.filter(user=request.user, is_active=True).delete()
    return JsonResponse({'status': 'ok'})

@login_required
@require_http_methods(["POST"])
def cancel_group_request(request):
    """Полностью удаляет активную групповую заявку пользователя"""
    group = GroupRequest.objects.filter(user=request.user, is_active=True).first()
    if group:
        GroupMember.objects.filter(group=group).delete()
        group.delete()
    return JsonResponse({'status': 'ok'})

@login_required
@require_http_methods(["POST"])
def cancel_search(request):
    """Полностью УДАЛЯЕТ заявку из БД (для кнопки "Назад")"""
    SoloRequest.objects.filter(user=request.user, is_active=True).delete()
    group = GroupRequest.objects.filter(user=request.user, is_active=True).first()
    if group:
        GroupMember.objects.filter(group=group).delete()
        group.delete()
    request.session.pop('search_building', None)
    request.session.pop('search_budget', None)
    request.session.pop('skipped_match_ids', None)
    request.session.pop('skipped_group_ids', None)
    request.session.pop('match_user_id', None)
    request.session.pop('match_request_id', None)
    request.session.pop('match_group_id', None)
    return JsonResponse({'status': 'ok'})

@login_required
@require_http_methods(["POST"])
def deactivate_search(request):
    """Деактивирует заявку (is_active=False) — НЕ УДАЛЯЕТ из БД (для кнопки "Аннулировать" и "Не искать")"""
    SoloRequest.objects.filter(user=request.user, is_active=True).update(is_active=False)
    GroupRequest.objects.filter(user=request.user, is_active=True).update(is_active=False)
    request.session.pop('search_building', None)
    request.session.pop('search_budget', None)
    request.session.pop('skipped_match_ids', None)
    request.session.pop('skipped_group_ids', None)
    request.session.pop('match_user_id', None)
    request.session.pop('match_request_id', None)
    request.session.pop('match_group_id', None)
    return JsonResponse({'status': 'ok'})

@login_required
@require_http_methods(["POST"])
def clear_skipped(request):
    """Очищает список пропущенных ID при поиске нового человека"""
    request.session.pop('skipped_match_ids', None)
    request.session.pop('skipped_group_ids', None)
    return JsonResponse({'status': 'ok'})

# ==================== ЗАВЕРШЕНИЕ ОБЕДА И ОЦЕНКА ====================

@login_required
@require_http_methods(["POST"])
def complete_meal(request, dialog_id):
    """Завершение обеда (личный и групповой чат)"""
    dialog = get_object_or_404(Dialog, id=dialog_id)
    
    if request.user not in dialog.participants.all():
        return JsonResponse({'error': 'Доступ запрещен'}, status=403)
    
    if dialog.is_meal_completed:
        return JsonResponse({'error': 'Обед уже завершён'}, status=400)
    
    # Отмечаем диалог как завершённый
    dialog.is_meal_completed = True
    dialog.completed_by = request.user
    dialog.completed_at = timezone.now()
    dialog.save()
    
    # Системное сообщение
    Message.objects.create(
        dialog=dialog,
        sender=request.user,
        text='[system] 🍽️ Обед завершён!'
    )
    
    return JsonResponse({'status': 'ok'})


@login_required
@require_http_methods(["GET"])
def check_dialog_status(request, dialog_id):
    """Проверяет статус диалога (завершён ли обед, оценён ли пользователь)"""
    dialog = get_object_or_404(Dialog, id=dialog_id)
    
    if request.user not in dialog.participants.all():
        return JsonResponse({'error': 'Доступ запрещен'}, status=403)
    
    # Для личного чата
    if dialog.participants.count() == 2:
        other_user = dialog.participants.exclude(id=request.user.id).first()
        has_rated = UserRating.objects.filter(
            from_user=request.user, 
            to_user=other_user
        ).exists()
        
        return JsonResponse({
            'is_meal_completed': dialog.is_meal_completed,
            'has_rated': has_rated,
            'other_user_id': other_user.id if other_user else None,
            'is_group': False
        })
    
    # Для группового чата
    else:
        # Получаем прогресс оценки для этого пользователя
        progress, created = GroupRatingProgress.objects.get_or_create(
            dialog=dialog,
            user=request.user
        )
        
        # Список участников (исключая себя)
        participants = list(dialog.participants.exclude(id=request.user.id))
        total_count = len(participants)
        rated_count = progress.rated_users.count()
        
        # Все ли оценены?
        all_rated = rated_count >= total_count
        
        return JsonResponse({
            'is_meal_completed': dialog.is_meal_completed,
            'has_rated': all_rated,
            'is_group': True,
            'total_participants': total_count,
            'rated_count': rated_count
        })


@login_required
def group_rate(request, dialog_id):
    """Страница пошаговой оценки участников группы"""
    dialog = get_object_or_404(Dialog, id=dialog_id)
    
    if request.user not in dialog.participants.all():
        return HttpResponseForbidden("Вы не участник этого диалога")
    
    if not dialog.is_meal_completed:
        return redirect('dialog_detail', dialog_id=dialog_id)
    
    # Получаем или создаём прогресс
    progress, created = GroupRatingProgress.objects.get_or_create(
        dialog=dialog,
        user=request.user
    )
    
    # Список всех участников (исключая себя)
    all_participants = list(dialog.participants.exclude(id=request.user.id))
    total_count = len(all_participants)
    
    # Уже оценённые
    rated_ids = progress.rated_users.values_list('id', flat=True)
    rated_count = len(rated_ids)
    
    # Пропущенные (кто в skipped_users)
    skipped_ids = progress.skipped_users.values_list('id', flat=True)
    
    # Список для отображения: сначала не оценённые и не пропущенные, потом пропущенные
    not_rated = [p for p in all_participants if p.id not in rated_ids and p.id not in skipped_ids]
    skipped_list = [p for p in all_participants if p.id in skipped_ids]
    
    remaining_users = not_rated + skipped_list
    current_index = progress.current_index
    
    # Если все оценены — перенаправляем в список чатов
    if rated_count >= total_count:
        return redirect('messages_list')
    
    # Корректируем индекс, если вышел за пределы
    if current_index >= len(remaining_users):
        current_index = 0
        progress.current_index = 0
        progress.save()
    
    current_user = remaining_users[current_index] if remaining_users else None
    
    # Собираем данные для точечек
    dots = []
    for i, user in enumerate(remaining_users):
        if user.id in rated_ids:
            status = 'rated'  # оценён
        elif user.id in skipped_ids:
            status = 'skipped'  # пропущен
        else:
            status = 'pending'  # ожидает
        dots.append({
            'id': user.id,
            'status': status,
            'is_current': i == current_index
        })
    
    return render(request, 'roulette/group_rate.html', {
        'dialog': dialog,
        'current_user': current_user,
        'current_index': current_index + 1,
        'total_count': total_count,
        'dots': dots,
        'rated_count': rated_count,
        'stars_range': range(1, 6)
    })


@login_required
@require_http_methods(["POST"])
def save_group_rating(request, dialog_id):
    """Сохраняет оценку участника группы"""
    data = json.loads(request.body)
    user_id = data.get('user_id')
    rating = data.get('rating')
    text = data.get('text', '')
    photo_url = data.get('photo_url', '')
    
    dialog = get_object_or_404(Dialog, id=dialog_id)
    to_user = get_object_or_404(get_user_model(), id=user_id)
    
    if request.user not in dialog.participants.all():
        return JsonResponse({'error': 'Доступ запрещен'}, status=403)
    
    # Сохраняем оценку
    GroupUserRating.objects.create(
        dialog=dialog,
        from_user=request.user,
        to_user=to_user,
        rating=rating,
        text=text,
        photo_url=photo_url
    )
    
    # Обновляем рейтинг пользователя
    all_ratings = UserRating.objects.filter(to_user=to_user)
    total = sum(r.rating for r in all_ratings)
    count = all_ratings.count()
    to_user.profile.rating = total / count if count > 0 else 0
    to_user.profile.rating_count = count
    to_user.profile.save()
    
    # Обновляем прогресс
    progress = GroupRatingProgress.objects.get(dialog=dialog, user=request.user)
    progress.rated_users.add(to_user)
    
    # Если этот пользователь был в пропущенных — убираем оттуда
    if to_user in progress.skipped_users.all():
        progress.skipped_users.remove(to_user)
    
    # Переходим к следующему
    all_participants = list(dialog.participants.exclude(id=request.user.id))
    rated_ids = progress.rated_users.values_list('id', flat=True)
    skipped_ids = progress.skipped_users.values_list('id', flat=True)
    
    remaining = [p for p in all_participants if p.id not in rated_ids]
    progress.current_index = 0
    progress.save()
    
    return JsonResponse({'status': 'ok'})


@login_required
@require_http_methods(["POST"])
def skip_group_rating(request, dialog_id):
    """Пропускает участника (оценить позже)"""
    data = json.loads(request.body)
    user_id = data.get('user_id')
    
    dialog = get_object_or_404(Dialog, id=dialog_id)
    to_user = get_object_or_404(get_user_model(), id=user_id)
    
    if request.user not in dialog.participants.all():
        return JsonResponse({'error': 'Доступ запрещен'}, status=403)
    
    progress = GroupRatingProgress.objects.get(dialog=dialog, user=request.user)
    
    # Добавляем в пропущенные
    if to_user not in progress.skipped_users.all():
        progress.skipped_users.add(to_user)
    
    # Переходим к следующему
    all_participants = list(dialog.participants.exclude(id=request.user.id))
    rated_ids = progress.rated_users.values_list('id', flat=True)
    
    remaining = [p for p in all_participants if p.id not in rated_ids]
    
    # Корректируем индекс
    if progress.current_index >= len(remaining) - 1:
        progress.current_index = 0
    else:
        progress.current_index += 1
    progress.save()
    
    return JsonResponse({'status': 'ok'})


@login_required
@require_http_methods(["GET"])
def get_group_rating_progress(request, dialog_id):
    """Возвращает текущий прогресс оценки для обновления точечек"""
    dialog = get_object_or_404(Dialog, id=dialog_id)
    
    if request.user not in dialog.participants.all():
        return JsonResponse({'error': 'Доступ запрещен'}, status=403)
    
    progress = GroupRatingProgress.objects.get(dialog=dialog, user=request.user)
    
    all_participants = list(dialog.participants.exclude(id=request.user.id))
    rated_ids = progress.rated_users.values_list('id', flat=True)
    skipped_ids = progress.skipped_users.values_list('id', flat=True)
    
    remaining = [p for p in all_participants if p.id not in rated_ids]
    
    dots = []
    for i, user in enumerate(remaining):
        if user.id in rated_ids:
            status = 'rated'
        elif user.id in skipped_ids:
            status = 'skipped'
        else:
            status = 'pending'
        dots.append({
            'id': user.id,
            'status': status,
            'is_current': i == progress.current_index
        })
    
    return JsonResponse({
        'dots': dots,
        'current_index': progress.current_index,
        'total_remaining': len(remaining),
        'rated_count': rated_ids.count()
    })