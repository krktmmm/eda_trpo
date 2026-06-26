from roulette.models import SoloRequest, GroupRequest, Dialog, Message
from places.models import Place, Review, ReviewImage
from django.contrib.auth import get_user_model
from rest_framework import serializers
from users.models import Profile

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'date_joined']

class ProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = Profile
        fields = ['user', 'telegram', 'vk', 'avatar', 'bio', 'course', 'group', 
                  'favorite_cuisine', 'rating', 'rating_count', 'theme', 'font_size']
        read_only_fields = ['rating', 'rating_count']

class ReviewImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReviewImage
        fields = ['id', 'image', 'order']

class ReviewSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    images = ReviewImageSerializer(many=True, read_only=True)
    stars_display = serializers.SerializerMethodField()
    
    class Meta:
        model = Review
        fields = ['id', 'user', 'rating', 'text', 'created_at', 'images', 'stars_display']
    
    def get_stars_display(self, obj):
        return "⭐" * obj.rating

class PlaceSerializer(serializers.ModelSerializer):
    reviews = ReviewSerializer(many=True, read_only=True)
    rating_display = serializers.SerializerMethodField()
    favorited = serializers.SerializerMethodField()
    
    class Meta:
        model = Place
        fields = ['id', 'name', 'address', 'time_from_building_1', 'time_from_building_3', 
                  'time_from_building_5', 'nearest_building', 'cuisine_type', 'avg_price',
                  'student_discount', 'opening_hours', 'image', 'latitude', 'longitude',
                  'rating', 'rating_count', 'rating_display', 'reviews', 'favorited']
    
    def get_rating_display(self, obj):
        return round(obj.rating, 1) if obj.rating else 0
    
    def get_favorited(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            from places.models import Favorite
            return Favorite.objects.filter(user=request.user, place=obj).exists()
        return False

class SoloRequestSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = SoloRequest
        fields = ['id', 'user', 'building', 'budget', 'telegram', 'vk', 'is_active', 'created_at']

class GroupRequestSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    members_count = serializers.SerializerMethodField()
    slots_left = serializers.SerializerMethodField()
    
    class Meta:
        model = GroupRequest
        fields = ['id', 'user', 'building', 'budget', 'needed_people', 'current_members',
                  'telegram', 'vk', 'is_active', 'created_at', 'members_count', 'slots_left']
    
    def get_members_count(self, obj):
        return obj.current_members
    
    def get_slots_left(self, obj):
        return obj.needed_people - obj.current_members

class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    is_mine = serializers.SerializerMethodField()
    
    class Meta:
        model = Message
        fields = ['id', 'sender', 'text', 'is_read', 'created_at', 'is_mine']
    
    def get_is_mine(self, obj):
        request = self.context.get('request')
        return request.user == obj.sender if request else False

class DialogSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)
    participants = UserSerializer(many=True, read_only=True)
    unread_count = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    chat_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Dialog
        fields = ['id', 'participants', 'created_at', 'is_meal_completed', 
                  'is_group_chat', 'messages', 'unread_count', 'last_message', 'chat_name']
    
    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.messages.filter(is_read=False).exclude(sender=request.user).count()
        return 0
    
    def get_last_message(self, obj):
        msg = obj.messages.last()
        return MessageSerializer(msg, context=self.context).data if msg else None
    
    def get_chat_name(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            other = obj.participants.exclude(id=request.user.id)
            if other.count() == 1 and not obj.is_group_chat:
                return other.first().username
        return "Группа" if obj.is_group_chat else "Чат"