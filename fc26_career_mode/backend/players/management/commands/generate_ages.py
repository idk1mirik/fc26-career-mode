from django.core.management.base import BaseCommand
from players.models import Player
import random


class Command(BaseCommand):

    def handle(self, *args, **kwargs):

        for player in Player.objects.all():

            ov = player.overall

            if ov >= 88:
                age = random.randint(24, 32)

            elif ov >= 84:
                age = random.randint(22, 30)

            elif ov >= 80:
                age = random.randint(20, 29)

            elif ov >= 75:
                age = random.randint(18, 28)

            else:
                age = random.randint(17, 26)

            player.age = age

            player.save()

        self.stdout.write(
            self.style.SUCCESS(
                "Ages generated."
            )
        )