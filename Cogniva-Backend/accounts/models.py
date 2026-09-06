from django.db import models

# Create your models here.
from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ROLE_CHOICES = (
        ('patient', 'Patient'),
        ('caregiver', 'Caregiver'),
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    preferred_language = models.CharField(max_length=10, default='hi')  # for voice agent
    phone_number = models.CharField(max_length=15, blank=True, null=True)

class CaregiverPatientLink(models.Model):
    caregiver = models.ForeignKey(User, related_name='patients_managed', on_delete=models.CASCADE, limit_choices_to={'role': 'caregiver'})
    patient = models.ForeignKey(User, related_name='caregivers', on_delete=models.CASCADE, limit_choices_to={'role': 'patient'})
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('caregiver', 'patient')

class Memory(models.Model):
    patient = models.ForeignKey(User, related_name='memories', on_delete=models.CASCADE, limit_choices_to={'role': 'patient'})
    fact = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

class Reminder(models.Model):
    patient = models.ForeignKey(User, related_name='reminders', on_delete=models.CASCADE, limit_choices_to={'role': 'patient'})
    text = models.CharField(max_length=255)
    time = models.CharField(max_length=50)  # keeping as free text for now, matches voice agent's current shape
    created_at = models.DateTimeField(auto_now_add=True)
    completed = models.BooleanField(default=False)

class GameLog(models.Model):
    patient = models.ForeignKey(User, related_name='game_logs', on_delete=models.CASCADE, limit_choices_to={'role': 'patient'})
    game_type = models.CharField(max_length=50)
    score = models.IntegerField(default=0)
    difficulty = models.CharField(max_length=20, default='medium')
    played_at = models.DateTimeField(auto_now_add=True)