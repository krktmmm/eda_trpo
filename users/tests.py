from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from .models import Profile

class ProfileModelTest(TestCase):
    """Тесты для модели профиля пользователя"""
    
    def setUp(self):
        """Создаём тестового пользователя перед каждым тестом"""
        self.user = User.objects.create_user(
            username="testuser",
            password="testpass123",
            email="test@example.com"
        )
    
    def test_profile_created_automatically(self):
        """Проверяем, что профиль создаётся автоматически при регистрации"""
        self.assertTrue(hasattr(self.user, 'profile'))
        self.assertIsNotNone(self.user.profile)
    
    def test_profile_fields_defaults(self):
        """Проверяем значения полей профиля по умолчанию"""
        profile = self.user.profile
        self.assertEqual(profile.telegram, "")
        self.assertEqual(profile.vk, "")
        self.assertFalse(profile.avatar)
        self.assertEqual(profile.theme, "light")
        self.assertEqual(profile.font_size, "medium")
        self.assertEqual(profile.greeting_style, "sweet")
        self.assertEqual(profile.animations, "on")
    
    def test_profile_str_method(self):
        """Проверяем строковое представление профиля"""
        expected = f"Profile of {self.user.username}"
        self.assertEqual(str(self.user.profile), expected)
    
    def test_profile_can_update(self):
        """Проверяем, что можно обновить поля профиля"""
        profile = self.user.profile
        profile.telegram = "@testuser"
        profile.vk = "vk.com/testuser"
        profile.save()
        
        updated_profile = Profile.objects.get(user=self.user)
        self.assertEqual(updated_profile.telegram, "@testuser")
        self.assertEqual(updated_profile.vk, "vk.com/testuser")
    
    def test_is_online_method(self):
        """Проверяем метод is_online (активность в последние 5 минут)"""
        from django.utils import timezone
        from datetime import timedelta
        
        profile = self.user.profile
        
        # Только что обновили — должен быть онлайн
        profile.last_activity = timezone.now()
        self.assertTrue(profile.is_online())
        
        # Был активен 6 минут назад — должен быть офлайн
        profile.last_activity = timezone.now() - timedelta(minutes=6)
        self.assertFalse(profile.is_online())
    
    def test_get_last_activity_display(self):
        """Проверяем умное отображение последней активности"""
        from django.utils import timezone
        from datetime import timedelta
        
        profile = self.user.profile
        now = timezone.now()
        
        # Сегодня
        profile.last_activity = now
        self.assertIn("в ", profile.get_last_activity_display())
        
        # Вчера
        profile.last_activity = now - timedelta(days=1)
        self.assertIn("вчера", profile.get_last_activity_display())
        
        # Несколько дней назад
        profile.last_activity = now - timedelta(days=3)
        self.assertIn("дня", profile.get_last_activity_display())


class UserRegistrationTest(TestCase):
    """Тесты для регистрации пользователя"""
    
    def test_create_user(self):
        """Проверяем создание пользователя"""
        user = User.objects.create_user(
            username="newuser",
            password="newpass123"
        )
        self.assertEqual(user.username, "newuser")
        self.assertTrue(user.check_password("newpass123"))
    
    def test_user_has_profile_after_creation(self):
        """Проверяем, что профиль создаётся сразу после регистрации"""
        user = User.objects.create_user(
            username="anotheruser",
            password="pass123"
        )
        self.assertTrue(hasattr(user, 'profile'))
        self.assertEqual(user.profile.user, user)

class ProfileViewsTest(TestCase):
    """Тесты для страниц профиля"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            password="testpass123",
            email="test@example.com"
        )
    
    def test_profile_page_redirects_unauthenticated(self):
        """Проверяем, что неавторизованного редиректит на логин"""
        response = self.client.get('/profile/')
        self.assertNotEqual(response.status_code, 200)
    
    def test_profile_page_authenticated(self):
        """Проверяем, что авторизованный видит свой профиль"""
        self.client.login(username="testuser", password="testpass123")
        response = self.client.get('/profile/')
        self.assertEqual(response.status_code, 200)
    
    def test_profile_page_uses_correct_template(self):
        """Проверяем, что используется правильный шаблон"""
        self.client.login(username="testuser", password="testpass123")
        response = self.client.get('/profile/')
        self.assertTemplateUsed(response, 'users/profile.html')
    
    def test_profile_contains_username(self):
        """Проверяем, что на странице отображается имя пользователя"""
        self.client.login(username="testuser", password="testpass123")
        response = self.client.get('/profile/')
        self.assertContains(response, "testuser")
    
    def test_public_profile_page_exists(self):
        """Проверяем, что публичный профиль другого пользователя открывается"""
        other_user = User.objects.create_user(
            username="otheruser",
            password="pass123"
        )
        self.client.login(username="testuser", password="testpass123")
        response = self.client.get(f'/profile/{other_user.username}/')
        self.assertEqual(response.status_code, 200)
    
    def test_public_profile_contains_other_username(self):
        """Проверяем, что в публичном профиле отображается имя другого пользователя"""
        other_user = User.objects.create_user(
            username="otheruser",
            password="pass123"
        )
        self.client.login(username="testuser", password="testpass123")
        response = self.client.get(f'/profile/{other_user.username}/')
        self.assertContains(response, "otheruser")
    
    def test_own_profile_redirects_from_public(self):
        """Проверяем, что при попытке открыть свой профиль через public_profile редиректит"""
        self.client.login(username="testuser", password="testpass123")
        response = self.client.get(f'/profile/{self.user.username}/')
        self.assertEqual(response.status_code, 302)  # Редирект на /profile/


class SettingsViewTest(TestCase):
    """Тесты для страницы настроек"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            password="testpass123"
        )
    
    def test_settings_page_requires_login(self):
        """Проверяем, что настройки требуют авторизации"""
        response = self.client.get('/profile/settings/')
        self.assertNotEqual(response.status_code, 200)
    
    def test_settings_page_authenticated(self):
        """Проверяем, что авторизованный может открыть настройки"""
        self.client.login(username="testuser", password="testpass123")
        response = self.client.get('/profile/settings/')
        self.assertEqual(response.status_code, 200)
    
    def test_settings_update_theme(self):
        """Проверяем, что можно изменить тему"""
        self.client.login(username="testuser", password="testpass123")
        
        response = self.client.post('/profile/settings/', {
            'theme': 'dark',
            'font_size': 'medium',
            'greeting_style': 'sweet',
            'animations': 'on'
        })
        
        self.assertEqual(response.status_code, 302)  # Редирект после сохранения
        
        # Проверяем, что тема изменилась
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.theme, 'dark')