from django.http import JsonResponse

from .models import Player


def players_list(request):
    players = Player.objects.all()[:100]

    data = []

    for player in players:
        data.append({
            'id': player.id,
            'name': player.name,
            'club': player.club.name,
            'overall': player.overall,
            'position': player.position,
            'value': player.value,
        })

    return JsonResponse(data, safe=False)