from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.db import models
import json
import random
from .models import SoloRequest, GroupRequest, GroupMember

# Вспомогательная функция для соседних корпусов
def get_nearby_buildings(building):
    nearby_map = {
        '1': ['3'],
        '3': ['1', '5'],
        '5': ['3']
    }
    return nearby_map.get(building, [])

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
        base_queryset = base_queryset.filter(budget=user_request.budget)
    
    # 1. Идеальное совпадение: тот же корпус
    perfect = list(base_queryset.filter(building=user_request.building))
    
    if perfect:
        match = random.choice(perfect)
        return JsonResponse({
            'status': 'found',
            'username': match.user.username,
            'telegram': match.telegram,
            'vk': match.vk,
            'building': match.get_building_display(),
            'budget': match.get_budget_display(),
            'match_type': 'perfect'
        })
    
    # 2. Соседний корпус
    nearby_buildings = get_nearby_buildings(user_request.building)
    nearby = list(base_queryset.filter(building__in=nearby_buildings))
    
    if nearby:
        match = random.choice(nearby)
        return JsonResponse({
            'status': 'found',
            'username': match.user.username,
            'telegram': match.telegram,
            'vk': match.vk,
            'building': match.get_building_display(),
            'budget': match.get_budget_display(),
            'match_type': 'nearby'
        })
    
    # 3. Любой корпус
    any_building = list(base_queryset)
    
    if any_building:
        match = random.choice(any_building)
        return JsonResponse({
            'status': 'found',
            'username': match.user.username,
            'telegram': match.telegram,
            'vk': match.vk,
            'building': match.get_building_display(),
            'budget': match.get_budget_display(),
            'match_type': 'any_building'
        })
    
    return JsonResponse({'status': 'not_found', 'message': 'Никого не найдено'}, status=404)


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