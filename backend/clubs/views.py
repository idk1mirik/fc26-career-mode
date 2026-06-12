from rest_framework import generics
from .models import Club
from leagues.models import League
from .serializers import ClubSerializer
from leagues.serializers import LeagueSerializer


class ClubListView(generics.ListAPIView):
    queryset = Club.objects.all()
    serializer_class = ClubSerializer


class ClubDetailView(generics.RetrieveAPIView):
    queryset = Club.objects.all()
    serializer_class = ClubSerializer


class LeagueListView(generics.ListAPIView):
    queryset = League.objects.all()
    serializer_class = LeagueSerializer