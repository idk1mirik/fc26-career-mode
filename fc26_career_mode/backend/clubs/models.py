from django.db import models


class Club(models.Model):
    name = models.CharField(max_length=100)
    budget = models.BigIntegerField(default=15000000)
    reputation = models.IntegerField(default=50)

    league = models.ForeignKey(
        "leagues.League",
        on_delete=models.CASCADE,
        related_name="clubs"
    )

    def calculate_overall(self):
        players = self.players.all()

        if not players.exists():
            return 60

        top = players.order_by("-overall")[:11]

        return round(
            sum(p.overall for p in top) / len(top)
        )

    @property
    def overall(self):

        players = self.players.all().order_by(
            "-overall"
        )[:18]

        if not players:
            return 60

        avg = sum(
            p.overall for p in players
        ) / len(players)

        return round(avg)