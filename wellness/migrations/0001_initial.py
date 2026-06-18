# Generated for the MediMind local Django backend.

from django.db import migrations, models
import wellness.models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Patient",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("contact", models.CharField(max_length=160, unique=True)),
                ("password_hash", models.CharField(max_length=256)),
                ("first_name", models.CharField(blank=True, max_length=80)),
                ("last_name", models.CharField(blank=True, max_length=80)),
                ("age", models.PositiveSmallIntegerField(blank=True, null=True)),
                ("height", models.FloatField(blank=True, null=True)),
                ("weight", models.FloatField(blank=True, null=True)),
                ("blood_group", models.CharField(blank=True, max_length=8)),
                ("wellness_data", models.JSONField(blank=True, default=wellness.models.empty_wellness_data)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
        ),
    ]
