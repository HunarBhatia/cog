from rest_framework import serializers
from .models import User, Memory, Reminder, GameLog

class UserRegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'password', 'role', 'preferred_language', 'phone_number']
        extra_kwargs = {'password': {'write_only': True}, 'id': {'read_only': True}}

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user

class MemorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Memory
        fields = ['id', 'fact', 'created_at']

class ReminderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reminder
        fields = ['id', 'text', 'time', 'completed', 'created_at']

class GameLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = GameLog
        fields = ['id', 'game_type', 'score', 'difficulty', 'played_at']