from django.db import models
from clubs.models import Club


class Player(models.Model):
    club = models.ForeignKey(
        Club,
        on_delete=models.CASCADE,
        related_name="players"
    )

    name = models.CharField(max_length=100)

    age = models.IntegerField(default=18)

    nationality = models.CharField(max_length=100, default="Unknown")

    position = models.CharField(max_length=10, default="CM")

    overall = models.IntegerField(default=70)
    potential = models.IntegerField(default=75)

    pace = models.IntegerField(default=50)
    shooting = models.IntegerField(default=50)
    passing = models.IntegerField(default=50)
    dribbling = models.IntegerField(default=50)
    defending = models.IntegerField(default=50)
    physical = models.IntegerField(default=50)

    # GK
    gk_diving = models.IntegerField(default=50)
    gk_handling = models.IntegerField(default=50)
    gk_kicking = models.IntegerField(default=50)
    gk_reflexes = models.IntegerField(default=50)
    gk_positioning = models.IntegerField(default=50)

    value = models.BigIntegerField(default=1000000)
    wage = models.BigIntegerField(default=10000)

    def __str__(self):
        return self.name