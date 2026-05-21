from .models import SoloRequest, GroupRequest, GroupMember, Dialog, Message, UserRating
from django.contrib.auth.models import User
from django.utils import timezone
from django.test import TestCase
from django.urls import reverse
import json

class SoloRequestModelTest(TestCase):
    """Тесты для соло-заявок"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            password="testpass123"
        )
        self.solo = SoloRequest.objects.create(
            user=self.user,
            building='1',
            budget='economy',
            telegram="@testuser",
            is_active=True
        )
    
    def test_solo_request_creation(self):
        """Проверяем создание соло-заявки"""
        self.assertEqual(self.solo.user.username, "testuser")
        self.assertEqual(self.solo.building, '1')
        self.assertEqual(self.solo.budget, 'economy')
        self.assertTrue(self.solo.is_active)
    
    def test_solo_request_str_method(self):
        """Проверяем строковое представление"""
        expected = "testuser - корпус 1"
        self.assertEqual(str(self.solo), expected)
    
    def test_solo_request_deactivate(self):
        """Проверяем деактивацию заявки"""
        self.solo.is_active = False
        self.solo.save()
        
        updated = SoloRequest.objects.get(id=self.solo.id)
        self.assertFalse(updated.is_active)


class GroupRequestModelTest(TestCase):
    """Тесты для групповых заявок"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username="group_leader",
            password="testpass123"
        )
        self.group = GroupRequest.objects.create(
            user=self.user,
            building='3',
            budget='any',
            needed_people=4,
            current_members=1,
            is_active=True
        )
    
    def test_group_request_creation(self):
        """Проверяем создание групповой заявки"""
        self.assertEqual(self.group.user.username, "group_leader")
        self.assertEqual(self.group.building, '3')
        self.assertEqual(self.group.needed_people, 4)
        self.assertEqual(self.group.current_members, 1)
    
    def test_group_request_str_method(self):
        """Проверяем строковое представление"""
        expected = "group_leader - ищет 4 чел. в корпус 3"
        self.assertEqual(str(self.group), expected)
    
    def test_group_member_creation(self):
        """Проверяем добавление участника в группу"""
        member = GroupMember.objects.create(
            group=self.group,
            user=self.user
        )
        self.assertEqual(member.group.id, self.group.id)
        self.assertEqual(member.user.username, "group_leader")


class DialogAndMessageTest(TestCase):
    """Тесты для диалогов и сообщений"""
    
    def setUp(self):
        self.user1 = User.objects.create_user(username="user1", password="pass123")
        self.user2 = User.objects.create_user(username="user2", password="pass123")
        self.dialog, created = Dialog.get_or_create_dialog(self.user1, self.user2)
    
    def test_dialog_creation(self):
        """Проверяем создание диалога между двумя пользователями"""
        self.assertEqual(self.dialog.participants.count(), 2)
        self.assertIn(self.user1, self.dialog.participants.all())
        self.assertIn(self.user2, self.dialog.participants.all())
    
    def test_dialog_get_or_create_returns_existing(self):
        """Проверяем, что повторный вызов возвращает существующий диалог"""
        dialog2, created = Dialog.get_or_create_dialog(self.user1, self.user2)
        self.assertEqual(self.dialog.id, dialog2.id)
        self.assertFalse(created)
    
    def test_message_creation(self):
        """Проверяем создание сообщения"""
        message = Message.objects.create(
            dialog=self.dialog,
            sender=self.user1,
            text="Привет!"
        )
        self.assertEqual(message.text, "Привет!")
        self.assertEqual(message.sender.username, "user1")
        self.assertFalse(message.is_read)
    
    def test_message_str_method(self):
        """Проверяем строковое представление сообщения"""
        message = Message.objects.create(
            dialog=self.dialog,
            sender=self.user1,
            text="Короткое сообщение"
        )
        self.assertIn("user1", str(message))
        self.assertIn("Короткое", str(message))


class UserRatingModelTest(TestCase):
    """Тесты для оценки пользователей"""
    
    def setUp(self):
        self.user_from = User.objects.create_user(username="rater", password="pass123")
        self.user_to = User.objects.create_user(username="rated", password="pass123")
        self.rating = UserRating.objects.create(
            from_user=self.user_from,
            to_user=self.user_to,
            rating=5,
            text="Отличный собеседник!"
        )
    
    def test_rating_creation(self):
        """Проверяем создание оценки"""
        self.assertEqual(self.rating.rating, 5)
        self.assertEqual(self.rating.text, "Отличный собеседник!")
        self.assertEqual(self.rating.from_user.username, "rater")
        self.assertEqual(self.rating.to_user.username, "rated")
    
    def test_rating_str_method(self):
        """Проверяем строковое представление"""
        expected = "rater → rated: 5⭐"
        self.assertEqual(str(self.rating), expected)
    
    def test_rating_unique_per_user(self):
        """Проверяем, что можно поставить несколько оценок разным пользователям"""
        user3 = User.objects.create_user(username="user3", password="pass123")
        rating2 = UserRating.objects.create(
            from_user=self.user_from,
            to_user=user3,
            rating=3,
            text="Норм"
        )
        self.assertIsNotNone(rating2)

class RouletteViewsTest(TestCase):
    """Тесты для страниц обед-рулетки"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            password="testpass123"
        )
    
    def test_roulette_page_returns_200(self):
        """Проверяем, что страница рулетки открывается"""
        response = self.client.get('/roulette/')
        self.assertEqual(response.status_code, 200)
    
    def test_roulette_page_uses_correct_template(self):
        """Проверяем, что используется правильный шаблон"""
        response = self.client.get('/roulette/')
        self.assertTemplateUsed(response, 'roulette/roulette.html')
    
    def test_messages_page_redirects_unauthenticated(self):
        """Проверяем, что неавторизованного редиректит на логин"""
        response = self.client.get('/roulette/messages/')
        self.assertNotEqual(response.status_code, 200)  # Редирект
    
    def test_messages_page_authenticated(self):
        """Проверяем, что авторизованный видит страницу сообщений"""
        self.client.login(username="testuser", password="testpass123")
        response = self.client.get('/roulette/messages/')
        self.assertEqual(response.status_code, 200)


class SoloRequestAPITest(TestCase):
    """Тесты для API соло-поиска"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            password="testpass123"
        )
        self.user2 = User.objects.create_user(
            username="otheruser",
            password="testpass123"
        )
    
    def test_save_solo_params_requires_login(self):
        """Проверяем, что сохранение параметров требует авторизации"""
        response = self.client.post('/roulette/api/solo/save-params/', {
            'building': '1',
            'budget': 'any'
        }, content_type='application/json')
        self.assertNotEqual(response.status_code, 200)
    
    def test_save_solo_params_authenticated(self):
        """Проверяем, что авторизованный может сохранить параметры"""
        self.client.login(username="testuser", password="testpass123")
        
        response = self.client.post('/roulette/api/solo/save-params/', 
            json.dumps({'building': '1', 'budget': 'any'}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)


class GroupRequestAPITest(TestCase):
    """Тесты для API группового поиска"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            password="testpass123"
        )
    
    def test_save_group_params_requires_login(self):
        """Проверяем, что сохранение параметров требует авторизации"""
        response = self.client.post('/roulette/api/group/save-params/', 
            json.dumps({'building': '1', 'budget': 'any', 'needed_people': 3}),
            content_type='application/json'
        )
        self.assertNotEqual(response.status_code, 200)
    
    def test_create_group_request_authenticated(self):
        """Проверяем, что авторизованный может создать групповую заявку"""
        self.client.login(username="testuser", password="testpass123")
        
        response = self.client.post('/roulette/api/group/create/',
            json.dumps({'building': '1', 'budget': 'any', 'needed_people': 3}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)