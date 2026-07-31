import random


def calculate_team_strength(players):
    total = 0

    for player in players:
        rating = player.overall

        rating += player.morale * 0.05
        rating += player.sharpness * 0.05

        if player.injured:
            rating -= 30

        rating += random.randint(-5, 5)

        total += rating

    return total


def simulate_match(home_club, away_club):
    home_players = home_club.players.all()
    away_players = away_club.players.all()

    home_strength = calculate_team_strength(
        home_players
    )

    away_strength = calculate_team_strength(
        away_players
    )

    home_strength += 15

    home_xg = round(
        random.uniform(0.5, home_strength / 250),
        2
    )

    away_xg = round(
        random.uniform(0.5, away_strength / 250),
        2
    )

    home_goals = round(home_xg * random.uniform(0.5, 1.5))
    away_goals = round(away_xg * random.uniform(0.5, 1.5))

    return {
        'home_goals': home_goals,
        'away_goals': away_goals,
        'home_xg': home_xg,
        'away_xg': away_xg,
    }