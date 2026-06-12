from django.urls import path

from .views import play_match


urlpatterns = [
    path(
        'play/<int:match_id>/',
        play_match
    ),
]