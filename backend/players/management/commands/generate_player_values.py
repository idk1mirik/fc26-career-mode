from django.core.management.base import BaseCommand
from players.models import Player


class Command(BaseCommand):

    def handle(self, *args, **kwargs):

        for player in Player.objects.all():

            base = ((player.overall - 45) ** 2) * 12000

            # AGE REALISTIC CURVE
            age = player.age

            if age <= 20:
                base *= 1.5
            elif age <= 24:
                base *= 1.2
            elif age <= 29:
                base *= 1.0
            elif age <= 33:
                base *= 0.75
            else:
                base *= 0.5

            # POSITION BOOST
            if player.position in ["ST", "LW", "RW", "CF"]:
                base *= 1.1

            # GK SPECIAL CASE
            if player.position == "GK":
                gk_avg = (
                    player.gk_diving +
                    player.gk_handling +
                    player.gk_kicking +
                    player.gk_reflexes +
                    player.gk_positioning
                ) / 5

                base = (gk_avg ** 2) * 9000

            # POTENTIAL BOOST
            base *= (1 + (player.potential - player.overall) / 200)

            # LIMITS
            base = max(150000, min(base, 200000000))

            player.value = int(base)
            player.save()

        self.stdout.write("VALUES UPDATED")