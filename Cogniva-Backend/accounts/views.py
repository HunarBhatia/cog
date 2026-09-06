from django.shortcuts import render

# Create your views here.
from rest_framework import generics, permissions
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import User, Memory, Reminder, GameLog
from .serializers import UserRegisterSerializer, MemorySerializer, ReminderSerializer, GameLogSerializer

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            "user": serializer.data,
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        })

class MemoryListCreateView(generics.ListCreateAPIView):
    serializer_class = MemorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Memory.objects.filter(patient=self.request.user)

    def perform_create(self, serializer):
        serializer.save(patient=self.request.user)

class ReminderListCreateView(generics.ListCreateAPIView):
    serializer_class = ReminderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Reminder.objects.filter(patient=self.request.user)

    def perform_create(self, serializer):
        serializer.save(patient=self.request.user)

class GameLogListCreateView(generics.ListCreateAPIView):
    serializer_class = GameLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return GameLog.objects.filter(patient=self.request.user).order_by('-played_at')

    def perform_create(self, serializer):
        serializer.save(patient=self.request.user)