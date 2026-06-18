from django.conf import settings
from django.urls import path, re_path
from django.views.static import serve

from wellness import views


urlpatterns = [
    path("", views.index, name="index"),
    path("api/signup/", views.signup, name="api_signup"),
    path("api/login/", views.login, name="api_login"),
    path("api/profile/", views.profile, name="api_profile"),
    path("api/wellness/", views.wellness_data, name="api_wellness"),
    re_path(r"^(?P<path>css/.*)$", serve, {"document_root": settings.BASE_DIR}),
    re_path(r"^(?P<path>js/.*)$", serve, {"document_root": settings.BASE_DIR}),
]
