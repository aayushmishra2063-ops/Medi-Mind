import json

from django.contrib.auth.hashers import check_password, make_password
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .models import Patient, empty_wellness_data


def index(request):
    return render(request, "index.html")


def json_body(request):
    try:
        return json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return {}


def normalize_wellness_data(data):
    merged = empty_wellness_data()
    if isinstance(data, dict):
        merged.update({key: value for key, value in data.items() if key in merged})
    return merged


@csrf_exempt
@require_http_methods(["POST"])
def signup(request):
    body = json_body(request)
    contact = (body.get("contact") or "").strip()
    password = body.get("password") or ""
    profile = body.get("profile") or {}

    if not contact or not password:
        return JsonResponse({"success": False, "error": "Contact and password are required."}, status=400)

    patient, _ = Patient.objects.get_or_create(contact=contact)
    patient.password_hash = make_password(password)
    patient.first_name = profile.get("firstName", "")
    patient.last_name = profile.get("lastName", "")
    patient.age = profile.get("age") or None
    patient.height = profile.get("height") or None
    patient.weight = profile.get("weight") or None
    patient.blood_group = profile.get("bloodGroup", "")
    patient.wellness_data = normalize_wellness_data(patient.wellness_data)
    patient.save()

    return JsonResponse({
        "success": True,
        "user_id": patient.id,
        "profile": patient.profile_payload(),
        "wellness": patient.wellness_data,
    })


@csrf_exempt
@require_http_methods(["POST"])
def login(request):
    body = json_body(request)
    contact = (body.get("contact") or "").strip()
    password = body.get("password") or ""

    try:
        patient = Patient.objects.get(contact=contact)
    except Patient.DoesNotExist:
        return JsonResponse({"success": False, "error": "No account found."}, status=404)

    if not check_password(password, patient.password_hash):
        return JsonResponse({"success": False, "error": "Incorrect password."}, status=401)

    return JsonResponse({
        "success": True,
        "user_id": patient.id,
        "profile": patient.profile_payload(),
        "wellness": normalize_wellness_data(patient.wellness_data),
    })


@csrf_exempt
@require_http_methods(["POST"])
def profile(request):
    body = json_body(request)
    contact = (body.get("contact") or "").strip()
    profile_data = body.get("profile") or {}

    try:
        patient = Patient.objects.get(contact=contact)
    except Patient.DoesNotExist:
        return JsonResponse({"success": False, "error": "Patient not found."}, status=404)

    patient.first_name = profile_data.get("firstName", "")
    patient.last_name = profile_data.get("lastName", "")
    patient.age = profile_data.get("age") or None
    patient.height = profile_data.get("height") or None
    patient.weight = profile_data.get("weight") or None
    patient.blood_group = profile_data.get("bloodGroup", "")
    patient.save()

    return JsonResponse({"success": True, "profile": patient.profile_payload()})


@csrf_exempt
@require_http_methods(["GET", "POST"])
def wellness_data(request):
    if request.method == "GET":
        contact = (request.GET.get("contact") or "").strip()
        try:
            patient = Patient.objects.get(contact=contact)
        except Patient.DoesNotExist:
            return JsonResponse({"success": False, "error": "Patient not found."}, status=404)
        return JsonResponse({"success": True, "wellness": normalize_wellness_data(patient.wellness_data)})

    body = json_body(request)
    contact = (body.get("contact") or "").strip()
    data = normalize_wellness_data(body.get("data") or {})

    try:
        patient = Patient.objects.get(contact=contact)
    except Patient.DoesNotExist:
        return JsonResponse({"success": False, "error": "Patient not found."}, status=404)

    patient.wellness_data = data
    patient.save(update_fields=["wellness_data", "updated_at"])
    return JsonResponse({"success": True, "wellness": patient.wellness_data})
