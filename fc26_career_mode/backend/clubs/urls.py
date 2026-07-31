from django.urls import path
from .views import ClubListView, ClubDetailView

urlpatterns = [
    path('', ClubListView.as_view()),
    path('<int:pk>/', ClubDetailView.as_view()),
]