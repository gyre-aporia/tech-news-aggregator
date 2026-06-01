from django.apps import AppConfig
import os

class NewsConfig(AppConfig): 
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'news' 

    def ready(self):
        if os.environ.get('RUN_MAIN', None) == 'true':
            from . import updater
            updater.start()