from rest_framework import serializers
from .models import League
from clubs.models import Club


class ClubMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Club
        fields = ["id", "name", "overall", "budget"]


class LeagueSerializer(serializers.ModelSerializer):

    clubs = ClubMiniSerializer(many=True, read_only=True)

    class Meta:
        model = League
        fields = "__all__"