"""
URL configuration for FC26 Career Mode Django backend.
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),

    # Core game APIs
    path('api/clubs/', include('clubs.urls')),
    path('api/leagues/', include('leagues.urls')),
    path('api/players/', include('players.urls')),
    path('api/matches/', include('matches.urls')),

    # Career mode features (URLs wired up as they are implemented)
    # path('api/contracts/', include('contracts.urls')),
    # path('api/transfers/', include('transfers.urls')),
    # path('api/tactics/', include('tactics.urls')),
    # path('api/youth/', include('youth.urls')),
    # path('api/simulation/', include('simulation.urls')),
    # path('api/schedules/', include('schedules.urls')),
    # path('api/notifications/', include('notifications.urls')),
    # path('api/media/', include('media.urls')),
    # path('api/users/', include('users.urls')),
]
