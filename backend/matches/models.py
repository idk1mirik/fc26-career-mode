from django.db import models

from clubs.models import Club
from leagues.models import League


class Match(models.Model):
    league = models.ForeignKey(
        League,
        on_delete=models.CASCADE,
        related_name='matches'
    )

    home_club = models.ForeignKey(
        Club,
        on_delete=models.CASCADE,
        related_name='home_matches'
    )

    away_club = models.ForeignKey(
        Club,
        on_delete=models.CASCADE,
        related_name='away_matches'
    )

    home_score = models.IntegerField(default=0)

    away_score = models.IntegerField(default=0)

    home_xg = models.FloatField(default=0)

    away_xg = models.FloatField(default=0)

    played = models.BooleanField(default=False)

    matchday = models.IntegerField(default=1)

    def __str__(self):
        return f'{self.home_club} vs {self.away_club}'