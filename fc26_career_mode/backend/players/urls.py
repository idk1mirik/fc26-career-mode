from django.urls import path

from .views import players_list


urlpatterns = [
    path(
        '',
        players_list
    ),
]