from .models import SoloRequest, GroupRequest, GroupMember, Dialog, Message
from django.views.decorators.http import require_http_methods
from django.http import JsonResponse, HttpResponseForbidden
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.models import User
from django.core.paginator import Paginator
from django.utils import timezone
from django.db import models
import random
import json

@login_required
def roulette(request):
    return render(request, 'roulette/roulette.html')

# Вспомогательная функция для соседних корпусов
def get_nearby_buildings(building):
    nearby_map = {
        '1': ['3'],
        '3': ['1', '5'],
        '5': ['3']
    }
    return nearby_map.get(building, [])


# ==================== ФУНКЦИЯ ДЛЯ СОЗДАНИЯ ДИАЛОГА ====================

def get_or_create_dialog(user1, user2):
    """Найти или создать диалог между двумя пользователями"""
    # Ищем существующий диалог
    existing = Dialog.objects.filter(participants=user1).filter(participants=user2)
    if existing.exists():
        return existing.first()
    
    # Создаём новый
    dialog = Dialog.objects.create()
    dialog.participants.add(user1, user2)
    return dialog


# ==================== СОЛО (поиск 1 собеседника) ====================

@login_required
@csrf_exempt
@require_http_methods(["POST"])
def create_solo_request(request):
    """Создание заявки на поиск собеседника"""
    try:
        data = json.loads(request.body)
        building = data.get('building')
        budget = data.get('budget', 'any')
        profile = request.user.profile
        
        # Деактивируем старые заявки пользователя
        SoloRequest.objects.filter(user=request.user, is_active=True).update(is_active=False)
        
        # Создаём новую
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
    """Поиск случайного собеседника (с приоритетами)"""
    user_request = SoloRequest.objects.filter(user=request.user, is_active=True).first()
    if not user_request:
        return JsonResponse({'error': 'У вас нет активной заявки'}, status=404)
    
    # Базовый запрос: активные заявки, не свои
    base_queryset = SoloRequest.objects.filter(is_active=True).exclude(user=request.user)
    
    # Фильтрация по бюджету (только если не "any")
    if user_request.budget != 'any':
        base_queryset = base_queryset.filter(
            models.Q(budget=user_request.budget) | models.Q(budget='any')
            )
    
    # 1. Идеальное совпадение: тот же корпус
    perfect = list(base_queryset.filter(building=user_request.building))
    
    if perfect:
        match = random.choice(perfect)
        
        request.session['match_user_id'] = match.user.id
        request.session['match_request_id'] = match.id
        
        return JsonResponse({
            'status': 'found',
            'username': match.user.username,
            'telegram': match.telegram,
            'vk': match.vk,
            'building': match.get_building_display(),
            'budget': match.get_budget_display(),
            'match_type': 'perfect',
            'group_id': None,
        })
    
    # 2. Соседний корпус
    nearby_buildings = get_nearby_buildings(user_request.building)
    nearby = list(base_queryset.filter(building__in=nearby_buildings))
    
    if nearby:
        match = random.choice(nearby)
        
        request.session['match_user_id'] = match.user.id
        request.session['match_request_id'] = match.id
        
        return JsonResponse({
            'status': 'found',
            'username': match.user.username,
            'telegram': match.telegram,
            'vk': match.vk,
            'building': match.get_building_display(),
            'budget': match.get_budget_display(),
            'match_type': 'nearby',
            'group_id': None,
        })
    
    # 3. Любой корпус
    any_building = list(base_queryset)
    
    if any_building:
        match = random.choice(any_building)
        
        request.session['match_user_id'] = match.user.id
        request.session['match_request_id'] = match.id
        
        return JsonResponse({
            'status': 'found',
            'username': match.user.username,
            'telegram': match.telegram,
            'vk': match.vk,
            'building': match.get_building_display(),
            'budget': match.get_budget_display(),
            'match_type': 'any_building',
            'group_id': None,
        })
    
    return JsonResponse({'status': 'not_found', 'message': 'Никого не найдено'}, status=404)

@login_required
@require_http_methods(["POST"])
def accept_solo_match(request):
    """Подтверждение матча — создаёт диалог"""
    
    match_user_id = request.session.get('match_user_id')
    
    if not match_user_id:
        return JsonResponse({'error': 'Нет активного матча'}, status=404)
    
    try:
        match_user = User.objects.get(id=match_user_id)
    except User.DoesNotExist:
        return JsonResponse({'error': 'Пользователь не найден'}, status=404)
    
    # Деактивируем заявки обоих
    SoloRequest.objects.filter(user=match_user, is_active=True).update(is_active=False)
    SoloRequest.objects.filter(user=request.user, is_active=True).update(is_active=False)
    
    # Создаём диалог
    dialog, created = Dialog.get_or_create_dialog(request.user, match_user)
    
    # Очищаем сессию
    del request.session['match_user_id']
    
    return JsonResponse({
        'status': 'ok',
        'dialog_id': dialog.id
    })

# ==================== ГРУППА (поиск компании) ====================

@login_required
@csrf_exempt
@require_http_methods(["POST"])
def create_group_request(request):
    """Создание заявки на поиск компании"""
    try:
        data = json.loads(request.body)
        building = data.get('building')
        budget = data.get('budget', 'any')
        needed_people = data.get('needed_people', 2)
        profile = request.user.profile
        
        # Деактивируем старые заявки
        GroupRequest.objects.filter(user=request.user, is_active=True).update(is_active=False)
        
        # Создаём новую
        group = GroupRequest.objects.create(
            user=request.user,
            building=building,
            budget=budget,
            needed_people=needed_people,
            telegram=profile.telegram,
            vk=profile.vk,
            is_active=True
        )
        # Добавляем создателя как участника
        GroupMember.objects.create(group=group, user=request.user)
        
        return JsonResponse({'status': 'ok', 'id': group.id})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)


@login_required
@require_http_methods(["GET"])
def find_group_match(request):
    """Поиск компании для групповой заявки"""
    user_group = GroupRequest.objects.filter(user=request.user, is_active=True).first()
    if not user_group:
        return JsonResponse({'error': 'У вас нет активной заявки'}, status=404)
    
    # Базовый запрос
    base_queryset = GroupRequest.objects.filter(
        is_active=True,
        current_members__lt=models.F('needed_people')
    ).exclude(user=request.user)
    
    # Фильтр по бюджету
    if user_group.budget != 'any':
        base_queryset = base_queryset.filter(budget=user_group.budget)
    
    # Идеальное совпадение: корпус
    perfect = list(base_queryset.filter(building=user_group.building))
    
    if perfect:
        match = random.choice(perfect)
        return JsonResponse({
            'status': 'found',
            'username': match.user.username,
            'telegram': match.telegram,
            'vk': match.vk,
            'building': match.get_building_display(),
            'budget': match.get_budget_display(),
            'needed_people': match.needed_people,
            'match_type': 'perfect'
        })
    
    return JsonResponse({'status': 'not_found', 'message': 'Никого не найдено'}, status=404)


@login_required
@require_http_methods(["POST"])
def join_group(request, group_id):
    """Присоединение к группе"""
    group = get_object_or_404(GroupRequest, id=group_id, is_active=True)
    
    if GroupMember.objects.filter(group=group, user=request.user).exists():
        return JsonResponse({'error': 'Вы уже в этой группе'}, status=400)
    
    if group.current_members >= group.needed_people:
        return JsonResponse({'error': 'Группа уже заполнена'}, status=400)
    
    GroupMember.objects.create(group=group, user=request.user)
    group.current_members += 1
    group.save()
    
    if group.current_members >= group.needed_people:
        group.is_active = False
        group.save()
    
    return JsonResponse({'status': 'ok', 'current_members': group.current_members})


# ==================== ЛИЧНЫЕ СООБЩЕНИЯ ====================

@login_required
def messages_list(request):
    """Список диалогов пользователя (без дубликатов)"""
    
    # 1. Получаем ВСЕ ID диалогов текущего юзера через сет (автоматически убирает дубли)
    dialog_ids = set(
        Dialog.objects.filter(participants=request.user).values_list('id', flat=True)
    )
    
    # 2. Достаём сами объекты по уникальным ID
    all_dialogs = Dialog.objects.filter(id__in=dialog_ids)

    # 3. Сортируем в Python по последнему сообщению
    def get_last_message_time(dialog):
        last_msg = dialog.messages.last()
        return last_msg.created_at if last_msg else dialog.created_at

    sorted_dialogs = sorted(all_dialogs, key=get_last_message_time, reverse=True)

    dialogs_data = []
    for dialog in sorted_dialogs:
        last_message = dialog.messages.last()
        unread_count = dialog.messages.filter(is_read=False).exclude(sender=request.user).count()
        other_user = dialog.participants.exclude(id=request.user.id).first()
        if other_user:
            dialogs_data.append({
                'dialog': dialog,
                'last_message': last_message,
                'unread_count': unread_count,
                'other_user': other_user,
            })
    
    return render(request, 'roulette/messages.html', {'dialogs': dialogs_data})


@login_required
def dialog_detail(request, dialog_id):
    """Страница конкретного диалога"""
    dialog = get_object_or_404(Dialog, id=dialog_id)
    
    # Проверяем, что пользователь участник диалога
    if request.user not in dialog.participants.all():
        return HttpResponseForbidden("Вы не участник этого диалога")
    
    # Помечаем все сообщения как прочитанные
    dialog.messages.filter(is_read=False).exclude(sender=request.user).update(is_read=True)
    
    # Пагинация сообщений (по 20 на страницу)
    messages_list = dialog.messages.all()
    paginator = Paginator(messages_list, 20)
    page_number = request.GET.get('page', 1)
    messages = paginator.get_page(page_number)
    
    # Получаем собеседника
    other_user = dialog.participants.exclude(id=request.user.id).first()
    
    return render(request, 'roulette/dialog.html', {
        'dialog': dialog,
        'messages': messages,
        'other_user': other_user,
    })


@login_required
@csrf_exempt
@require_http_methods(["POST"])
def send_message(request, dialog_id):
    """API: отправка сообщения"""
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
        
        # Отправляем уведомление другому пользователю (через addNotification)
        other_user = dialog.participants.exclude(id=request.user.id).first()
        # Уведомление будет обработано на клиенте
        
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
    """API: количество непрочитанных сообщений"""
    dialogs = request.user.dialogs.all()
    unread_total = 0
    for dialog in dialogs:
        unread_total += dialog.messages.filter(is_read=False).exclude(sender=request.user).count()
    return JsonResponse({'unread_count': unread_total})


@login_required
@require_http_methods(["GET"])
def get_new_messages(request, dialog_id):
    """API: получить новые сообщения (для polling)"""
    after_id = request.GET.get('after_id')
    dialog = get_object_or_404(Dialog, id=dialog_id)
    
    if request.user not in dialog.participants.all():
        return JsonResponse({'error': 'Доступ запрещен'}, status=403)
    
    messages = dialog.messages.all()
    if after_id:
        messages = messages.filter(id__gt=after_id)
    
    # Помечаем новые сообщения как прочитанные
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
    """Удаление диалога"""
    dialog = get_object_or_404(Dialog, id=dialog_id)
    
    # Проверяем, что пользователь участник диалога
    if request.user not in dialog.participants.all():
        return JsonResponse({'error': 'Доступ запрещен'}, status=403)
    
    dialog.delete()
    
    return JsonResponse({'status': 'ok'})