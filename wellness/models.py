from django.db import models


def empty_wellness_data():
    return {
        "prescriptions": [],
        "mealsByDate": {},
        "waterByDate": {},
        "workoutsByDate": {},
        "labTests": [],
        "medicationReminders": [],
    }


class Patient(models.Model):
    contact = models.CharField(max_length=160, unique=True)
    password_hash = models.CharField(max_length=256)
    first_name = models.CharField(max_length=80, blank=True)
    last_name = models.CharField(max_length=80, blank=True)
    age = models.PositiveSmallIntegerField(null=True, blank=True)
    height = models.FloatField(null=True, blank=True)
    weight = models.FloatField(null=True, blank=True)
    blood_group = models.CharField(max_length=8, blank=True)
    wellness_data = models.JSONField(default=empty_wellness_data, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.contact

    def profile_payload(self):
        if not self.first_name:
            return None
        return {
            "firstName": self.first_name,
            "lastName": self.last_name,
            "age": self.age,
            "height": self.height,
            "weight": self.weight,
            "bloodGroup": self.blood_group,
        }
