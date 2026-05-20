from django.utils import timezone

class UpdateLastActivityMiddleware:
    """Обновляет время последней активности пользователя при каждом запросе"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        response = self.get_response(request)
        
        # Обновляем активность только для авторизованных пользователей
        if request.user.is_authenticated and hasattr(request.user, 'profile'):
            # Обновляем не чаще чем раз в минуту (оптимизация)
            now = timezone.now()
            last_activity = request.user.profile.last_activity
            
            if not last_activity or (now - last_activity).total_seconds() > 60:
                request.user.profile.last_activity = now
                request.user.profile.save(update_fields=['last_activity'])
        
        return response