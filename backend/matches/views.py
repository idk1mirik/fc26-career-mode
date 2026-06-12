from django.http import JsonResponse

from .models import Match

from simulation.engine import simulate_match


def play_match(request, match_id):
    match = Match.objects.get(id=match_id)

    if match.played:
        return JsonResponse({
            'error': 'Match already played'
        })

    result = simulate_match(
        match.home_club,
        match.away_club
    )

    match.home_score = result['home_goals']
    match.away_score = result['away_goals']

    match.home_xg = result['home_xg']
    match.away_xg = result['away_xg']

    match.played = True

    match.save()

    return JsonResponse({
        'home_team': match.home_club.name,
        'away_team': match.away_club.name,

        'score': f'{match.home_score}:{match.away_score}',

        'home_xg': match.home_xg,
        'away_xg': match.away_xg,
    })