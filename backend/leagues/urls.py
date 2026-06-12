from django.urls import path
from .views import LeagueListView, LeagueDetailView

urlpatterns = [
    path("", LeagueListView.as_view()),
    path("<int:pk>/", LeagueDetailView.as_view()),
]