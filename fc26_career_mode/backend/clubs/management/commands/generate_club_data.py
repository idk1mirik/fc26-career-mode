from django.core.management.base import BaseCommand

from clubs.models import Club
from players.models import Player


class Command(BaseCommand):

    def handle(self, *args, **kwargs):

        clubs = Club.objects.all()

        for club in clubs:

            players = Player.objects.filter(
                club=club
            ).order_by("-overall")[:18]

            if not players.exists():
                continue

            avg = sum(
                p.overall for p in players
            ) / len(players)

            overall = round(avg)

            reputation = min(
                99,
                overall + 5
            )

            # REALISTIC BUDGETS

            if overall >= 86:
                budget = 180000000

            elif overall >= 84:
                budget = 130000000

            elif overall >= 82:
                budget = 85000000

            elif overall >= 79:
                budget = 50000000

            elif overall >= 76:
                budget = 25000000

            elif overall >= 73:
                budget = 12000000

            else:
                budget = 5000000

            # tiny variation

            budget += (
                club.id % 5
            ) * 2000000

            club.budget = budget
            club.reputation = reputation

            club.save()

            print(
                f"{club.name} | OVR {overall} | €{budget}"
            )

        print("DONE")