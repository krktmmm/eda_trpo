from .models import SoloRequest, GroupRequest, GroupMember, Dialog, Message
from django.views.decorators.http import require_http_methods
from django.http import JsonResponse, HttpResponseForbidden
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, get_object_or_404
from django.core.paginator import Paginator
from django.utils import timezone
from django.conf import settings
from django.db import models
import random
import json

@login_required
def roulette(request):
    return render(request, 'roulette/roulette.html')

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
def create_solo_request(request):
    try:
        data = json.loads(request.body)
        building = data.get('building')
        budget = data.get('budget', 'any')
        profile = request.user.profile
        
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
    user_request = SoloRequest.objects.filter(user=request.user, is_active=True).first()
    if not user_request:
        return JsonResponse({'error': 'У вас нет активной заявки'}, status=404)
    
    base_queryset = SoloRequest.objects.filter(is_active=True).exclude(user=request.user)
    candidates = []
    
    building_order = get_building_order(user_request.building)
    
    for building in building_order:
        building_candidates = list(base_queryset.filter(building=building))
        
        if user_request.budget == 'any':
            random.shuffle(building_candidates)
            candidates.extend(building_candidates)
        else:
            same_budget = [m for m in building_candidates if m.budget == user_request.budget]
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
        
        # ✅ Получаем аватарку пользователя
        avatar_url = None
        if hasattr(match.user, 'profile') and match.user.profile.avatar:
            avatar_url = match.user.profile.avatar.url
        
        return JsonResponse({
            'status': 'found',
            'username': match.user.username,
            'telegram': match.telegram,
            'vk': match.vk,
            'avatar_url': avatar_url,  # ✅ URL аватарки (или None)
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
    
    match_user = get_object_or_404(settings.AUTH_USER_MODEL, id=match_user_id)
    
    SoloRequest.objects.filter(user=match_user, is_active=True).update(is_active=False)
    SoloRequest.objects.filter(user=request.user, is_active=True).update(is_active=False)
    
    dialog, created = Dialog.get_or_create_dialog(request.user, match_user)
    
    request.session.pop('match_user_id', None)
    request.session.pop('match_request_id', None)
    request.session.pop('skipped_match_ids', None)
    
    return JsonResponse({'status': 'ok', 'dialog_id': dialog.id})


# ==================== ГРУППА ====================

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
        
        # Проверяем — может уже есть активная группа
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
        
        # Деактивируем старые заявки
        GroupRequest.objects.filter(user=request.user, is_active=True).update(is_active=False)
        
        # Создаём группу БЕЗ чата
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
            'dialog_id': None  # чата пока нет
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@login_required
@require_http_methods(["POST"])
def create_company(request):
    """Создать компанию и чат (когда пользователь нажал «Создать компанию»)"""
    try:
        data = json.loads(request.body)
        size = int(data.get('size', 3))
        
        # Ищем активную группу пользователя
        group = GroupRequest.objects.filter(
            user=request.user,
            is_active=True
        ).first()
        
        if not group:
            return JsonResponse({'error': 'Нет активной заявки'}, status=404)
        
        # Обновляем размер группы
        group.needed_people = size
        group.save()
        
        # Создаём чат
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
    user_group = GroupRequest.objects.filter(user=request.user, is_active=True).first()
    if not user_group:
        return JsonResponse({'error': 'У вас нет активной заявки'}, status=404)
    
    base_queryset = GroupRequest.objects.filter(
        is_active=True,
        current_members__lt=models.F('needed_people')
    ).exclude(user=request.user)
    
    # Если пользователь указал конкретное количество — ищем такие же
    if user_group.needed_people and user_group.needed_people > 2:
        base_queryset = base_queryset.filter(needed_people=user_group.needed_people)
    
    candidates = []
    building_order = get_building_order(user_group.building)
    
    for building in building_order:
        building_groups = list(base_queryset.filter(building=building))
        
        if user_group.budget == 'any':
            random.shuffle(building_groups)
            candidates.extend(building_groups)
        else:
            same_budget = [g for g in building_groups if g.budget == user_group.budget]
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
        'your_group_id': user_group.id,
    })

@login_required
@require_http_methods(["POST"])
def join_group(request, group_id):
    group = get_object_or_404(GroupRequest, id=group_id, is_active=True)
    
    if GroupMember.objects.filter(group=group, user=request.user).exists():
        return JsonResponse({'error': 'Вы уже в этой группе'}, status=400)
    
    if group.current_members >= group.needed_people:
        return JsonResponse({'error': 'Группа уже заполнена'}, status=400)
    
    # ✅ Если чата ещё нет — создаём его
    if not group.dialog:
        dialog = Dialog.objects.create()
        # Добавляем всех текущих участников
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