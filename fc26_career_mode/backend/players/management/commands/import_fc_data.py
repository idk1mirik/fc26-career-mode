import pandas as pd

from django.core.management.base import BaseCommand
from django.db import transaction

from leagues.models import League
from clubs.models import Club
from players.models import Player


class Command(BaseCommand):

    help = "Import EA FC database"

    def handle(self, *args, **kwargs):

        TEAM_FIXES = {
            "Manchester City": "Man City",
            "Manchester United": "Man Utd",
            "Paris SG": "PSG",
        }

        df = pd.read_csv(
            "data/ea_fc26_players.csv",
            low_memory=False
        )

        print(f"IMPORTING {len(df)} PLAYERS")

        leagues_cache = {}
        clubs_cache = {}

        with transaction.atomic():

            Player.objects.all().delete()
            Club.objects.all().delete()
            League.objects.all().delete()

            for _, row in df.iterrows():

                try:

                    # ---------------- LEAGUE ----------------

                    league_name = str(
                        row.get(
                            "leagueName",
                            "Unknown League"
                        )
                    ).strip()

                    if league_name not in leagues_cache:

                        league = League.objects.create(
                            name=league_name
                        )

                        leagues_cache[league_name] = league

                    league = leagues_cache[league_name]

                    # ---------------- CLUB ----------------

                    raw_team = str(
                        row.get(
                            "team",
                            "Free Agents"
                        )
                    ).strip()

                    team_name = TEAM_FIXES.get(
                        raw_team,
                        raw_team
                    )

                    if team_name not in clubs_cache:

                        club = Club.objects.create(
                            name=team_name,
                            league=league,
                            budget=30000000,
                            reputation=70,
                        )

                        clubs_cache[team_name] = club

                    club = clubs_cache[team_name]

                    # ---------------- PLAYER NAME ----------------

                    common_name = row.get("commonName")

                    if pd.notna(common_name):
                        player_name = str(common_name).strip()

                    else:
                        first = str(
                            row.get("firstName", "")
                        ).strip()

                        last = str(
                            row.get("lastName", "")
                        ).strip()

                        player_name = f"{first} {last}"

                    # ---------------- AGE ----------------

                    birthdate = str(
                        row.get("birthdate", "")
                    )

                    try:

                        birth_year = int(
                            birthdate.split("/")[-1]
                            .split(" ")[0]
                        )

                        age = 2025 - birth_year

                    except:

                        age = 24

                    # ---------------- OVERALL ----------------

                    overall = int(
                        row.get(
                            "overallRating",
                            60
                        )
                    )

                    potential = overall + 2

                    if age <= 21:
                        potential += 6

                    elif age <= 24:
                        potential += 3

                    if potential > 99:
                        potential = 99

                    # ---------------- REALISTIC VALUE ----------------

                    value = ((overall - 45) ** 2.2) * 14000

                    if age <= 21:
                        value *= 1.45

                    elif age <= 24:
                        value *= 1.2

                    elif age >= 33:
                        value *= 0.55

                    elif age >= 30:
                        value *= 0.75

                    # attackers bonus

                    if str(row.get("position")) in [
                        "ST",
                        "CF",
                        "LW",
                        "RW",
                    ]:
                        value *= 1.08

                    # soft caps

                    if overall <= 75:
                        value *= 0.55

                    elif overall <= 80:
                        value *= 0.72

                    elif overall <= 84:
                        value *= 0.88

                    # limits

                    if value < 150000:
                        value = 150000

                    if value > 220000000:
                        value = 220000000

                    # ---------------- PLAYER CREATE ----------------

                    Player.objects.create(

                        club=club,

                        name=player_name,

                        age=age,

                        nationality=str(
                            row.get(
                                "nationality",
                                "Unknown"
                            )
                        ),

                        position=str(
                            row.get(
                                "position",
                                "CM"
                            )
                        ),

                        overall=overall,

                        potential=potential,

                        pace=int(row.get("pac", 50)),
                        shooting=int(row.get("sho", 50)),
                        passing=int(row.get("pas", 50)),
                        dribbling=int(row.get("dri", 50)),
                        defending=int(row.get("def", 50)),
                        physical=int(row.get("phy", 50)),

                        gk_diving=int(row.get("gkDiving", 50)),
                        gk_handling=int(row.get("gkHandling", 50)),
                        gk_kicking=int(row.get("gkKicking", 50)),
                        gk_reflexes=int(row.get("gkReflexes", 50)),
                        gk_positioning=int(row.get("gkPositioning", 50)),

                        value=int(value),
                    )

                except Exception as e:

                    print(f"ERROR ROW {_}: {e}")

        print("IMPORT DONE")    