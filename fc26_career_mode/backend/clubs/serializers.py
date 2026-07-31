from rest_framework import serializers
from .models import Club
from players.models import Player


class PlayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Player
        fields = "__all__"


class ClubSerializer(serializers.ModelSerializer):

    league = serializers.CharField(source="league.name", read_only=True)

    players = PlayerSerializer(many=True, read_only=True)

    overall = serializers.SerializerMethodField()

    class Meta:
        model = Club
        fields = [
            "id",
            "name",
            "overall",
            "budget",
            "reputation",
            "league",
            "players",
        ]

    def get_overall(self, obj):
        return obj.overall