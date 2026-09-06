from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import RegisterView, MemoryListCreateView, ReminderListCreateView, GameLogListCreateView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='login'),
    path('login/refresh/', TokenRefreshView.as_view(), name='login_refresh'),
    path('memory/', MemoryListCreateView.as_view(), name='memory'),
    path('reminders/', ReminderListCreateView.as_view(), name='reminders'),
    path('games/', GameLogListCreateView.as_view(), name='game-logs'),
]