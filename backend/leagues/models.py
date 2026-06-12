from django.db import models


class League(models.Model):
    name = models.CharField(max_length=255)

    season = models.IntegerField(default=2026)

    current_round = models.IntegerField(default=1)

    transfer_window_open = models.BooleanField(default=True)

    def __str__(self):
        return self.name