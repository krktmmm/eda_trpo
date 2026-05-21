from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth.models import User
from .models import Place, Review, Favorite
from django.test import TestCase
from django.urls import reverse

class PlaceModelTest(TestCase):
    """Тесты для модели заведения"""
    
    def setUp(self):
        """Создаём тестовое заведение перед каждым тестом"""
        self.place = Place.objects.create(
            name="Тестовая столовая",
            address="Корпус №1, 1 этаж",
            time_from_building_1=5,
            time_from_building_3=15,
            time_from_building_5=25,
            cuisine_type="Русская кухня",
            avg_price=250,
            student_discount="10%",
            rating=4.5,
            rating_count=10
        )
    
    def test_place_creation(self):
        """Проверяем, что заведение создаётся корректно"""
        self.assertEqual(self.place.name, "Тестовая столовая")
        self.assertEqual(self.place.address, "Корпус №1, 1 этаж")
        self.assertEqual(self.place.avg_price, 250)
        self.assertEqual(self.place.rating, 4.5)
    
    def test_place_str_method(self):
        """Проверяем, что __str__ возвращает название"""
        self.assertEqual(str(self.place), "Тестовая столовая")
    
    def test_place_default_values(self):
        """Проверяем значения по умолчанию"""
        new_place = Place.objects.create(
            name="Новое место",
            address="Адрес"
        )
        self.assertEqual(new_place.time_from_building_1, 100)  # default=100
        self.assertEqual(new_place.rating, 0)
        self.assertEqual(new_place.rating_count, 0)


class ReviewModelTest(TestCase):
    """Тесты для модели отзыва"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            password="testpass123"
        )
        self.place = Place.objects.create(
            name="Тестовое кафе",
            address="ул. Тестовая, 1"
        )
        self.review = Review.objects.create(
            place=self.place,
            user=self.user,
            rating=5,
            text="Очень вкусно!"
        )
    
    def test_review_creation(self):
        """Проверяем, что отзыв создаётся корректно"""
        self.assertEqual(self.review.rating, 5)
        self.assertEqual(self.review.text, "Очень вкусно!")
        self.assertEqual(self.review.user.username, "testuser")
        self.assertEqual(self.review.place.name, "Тестовое кафе")
    
    def test_review_str_method(self):
        """Проверяем строковое представление отзыва"""
        expected = "testuser - Тестовое кафе - 5⭐"
        self.assertEqual(str(self.review), expected)
    
    def test_review_has_created_at(self):
        """Проверяем, что created_at автоматически заполняется"""
        self.assertIsNotNone(self.review.created_at)


class FavoriteModelTest(TestCase):
    """Тесты для избранного"""
    
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", password="testpass123")
        self.place = Place.objects.create(name="Любимое место", address="Адрес")
        self.favorite = Favorite.objects.create(user=self.user, place=self.place)
    
    def test_favorite_creation(self):
        """Проверяем, что избранное создаётся"""
        self.assertEqual(self.favorite.user.username, "testuser")
        self.assertEqual(self.favorite.place.name, "Любимое место")
    
    def test_favorite_unique_together(self):
        """Проверяем, что нельзя добавить одно место дважды"""
        with self.assertRaises(Exception):
            Favorite.objects.create(user=self.user, place=self.place)
    
    def test_favorite_str_method(self):
        """Проверяем строковое представление"""
        expected = "testuser - Любимое место"
        self.assertEqual(str(self.favorite), expected)

class PlaceViewsTest(TestCase):
    """Тесты для views заведений"""
    
    def setUp(self):
        """Создаём тестовые данные перед каждым тестом"""
        self.user = User.objects.create_user(
            username="testuser",
            password="testpass123"
        )
        self.place = Place.objects.create(
            name="Тестовое кафе",
            address="ул. Тестовая, 1",
            time_from_building_1=5,
            time_from_building_3=10,
            time_from_building_5=15,
            avg_price=300,
            rating=4.5
        )
    
    def test_place_list_page_returns_200(self):
        """Проверяем, что страница со списком заведений открывается"""
        response = self.client.get('/places/')
        self.assertEqual(response.status_code, 200)
    
    def test_place_list_uses_correct_template(self):
        """Проверяем, что используется правильный шаблон"""
        response = self.client.get('/places/')
        self.assertTemplateUsed(response, 'places/place_list.html')
    
    def test_place_detail_page_returns_200(self):
        """Проверяем, что страница заведения открывается"""
        response = self.client.get(f'/place/{self.place.id}/')
        self.assertEqual(response.status_code, 200)
    
    def test_place_detail_uses_correct_template(self):
        """Проверяем, что используется правильный шаблон"""
        response = self.client.get(f'/place/{self.place.id}/')
        self.assertTemplateUsed(response, 'places/place_detail.html')
    
    def test_place_detail_contains_place_name(self):
        """Проверяем, что на странице отображается название заведения"""
        response = self.client.get(f'/place/{self.place.id}/')
        self.assertContains(response, "Тестовое кафе")
    
    def test_nonexistent_place_returns_404(self):
        """Проверяем, что несуществующее заведение возвращает 404"""
        response = self.client.get('/place/99999/')
        self.assertEqual(response.status_code, 404)


class AddReviewViewTest(TestCase):
    """Тесты для добавления отзыва"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            password="testpass123"
        )
        self.place = Place.objects.create(
            name="Тестовое кафе",
            address="ул. Тестовая, 1"
        )
    
    def test_unauthenticated_user_cannot_add_review(self):
        """Проверяем, что неавторизованный пользователь не может добавить отзыв"""
        response = self.client.post(f'/place/{self.place.id}/review/', {
            'rating': 5,
            'text': 'Вкусно!'
        })
        # Должен редиректить на страницу входа
        self.assertNotEqual(response.status_code, 200)
    
    def test_authenticated_user_can_add_review(self):
        """Проверяем, что авторизованный пользователь может добавить отзыв"""
        self.client.login(username="testuser", password="testpass123")
        
        response = self.client.post(f'/place/{self.place.id}/review/', {
            'rating': 5,
            'text': 'Очень вкусно!'
        })
        
        # Должен редиректить на страницу заведения
        self.assertEqual(response.status_code, 302)
        
        # Проверяем, что отзыв создался
        self.assertTrue(Review.objects.filter(place=self.place, user=self.user).exists())
    
    def test_cannot_add_review_without_rating(self):
        """Проверяем, что нельзя добавить отзыв без оценки"""
        self.client.login(username="testuser", password="testpass123")
        
        response = self.client.post(f'/place/{self.place.id}/review/', {
            'text': 'Текст без оценки'
        })
        
        # Отзыв не должен создаться
        self.assertFalse(Review.objects.filter(place=self.place, user=self.user).exists())
    
    def test_cannot_add_second_review_to_same_place(self):
        """Проверяем, что нельзя оставить второй отзыв на то же заведение"""
        self.client.login(username="testuser", password="testpass123")
        
        # Первый отзыв
        self.client.post(f'/place/{self.place.id}/review/', {
            'rating': 4,
            'text': 'Первый отзыв'
        })
        
        # Второй отзыв
        response = self.client.post(f'/place/{self.place.id}/review/', {
            'rating': 5,
            'text': 'Второй отзыв'
        })
        
        # Должен быть редирект с сообщением об ошибке
        self.assertEqual(response.status_code, 302)
        
        # Отзывов должно быть ровно 1
        self.assertEqual(Review.objects.filter(place=self.place).count(), 1)


class FavoriteViewTest(TestCase):
    """Тесты для избранного"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            password="testpass123"
        )
        self.place = Place.objects.create(
            name="Любимое кафе",
            address="ул. Тестовая, 1"
        )
    
    def test_unauthenticated_user_cannot_favorite(self):
        """Проверяем, что неавторизованный пользователь не может добавить в избранное"""
        response = self.client.post(f'/favorites/toggle/{self.place.id}/')
        self.assertEqual(response.status_code, 302)  # Редирект на логин
    
    def test_authenticated_user_can_add_favorite(self):
        """Проверяем, что авторизованный пользователь может добавить в избранное"""
        self.client.login(username="testuser", password="testpass123")
        
        response = self.client.post(f'/favorites/toggle/{self.place.id}/')
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(Favorite.objects.filter(user=self.user, place=self.place).exists())
    
    def test_authenticated_user_can_remove_favorite(self):
        """Проверяем, что авторизованный пользователь может удалить из избранного"""
        self.client.login(username="testuser", password="testpass123")
        
        # Добавляем
        self.client.post(f'/favorites/toggle/{self.place.id}/')
        self.assertTrue(Favorite.objects.filter(user=self.user, place=self.place).exists())
        
        # Удаляем
        response = self.client.post(f'/favorites/toggle/{self.place.id}/')
        
        self.assertEqual(response.status_code, 200)
        self.assertFalse(Favorite.objects.filter(user=self.user, place=self.place).exists())
    
    def test_favorite_returns_json(self):
        """Проверяем, что эндпоинт возвращает JSON"""
        self.client.login(username="testuser", password="testpass123")
        
        response = self.client.post(f'/favorites/toggle/{self.place.id}/')
        
        self.assertEqual(response['Content-Type'], 'application/json')


class MainPageViewTest(TestCase):
    """Тесты для главной страницы"""
    
    def test_main_page_returns_200(self):
        """Проверяем, что главная страница открывается"""
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
    
    def test_main_page_uses_correct_template(self):
        """Проверяем, что используется правильный шаблон"""
        response = self.client.get('/')
        self.assertTemplateUsed(response, 'places/main_menu.html')