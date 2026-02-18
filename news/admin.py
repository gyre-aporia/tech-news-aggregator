# Importujeme hlavní nástroj pro administraci (vytváří grafické rozhraní)
from django.contrib import admin
from .models import News, Category, Profile
# Importujeme výchozí vzhled pro uživatele a samotný model User (tabulku uživatelů)
from django.contrib.auth.admin import UserAdmin 
from django.contrib.auth.models import User 


# Použij tento design (NewsAdmin) pro model News
@admin.register(News) 
class NewsAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'source', 'category', 'pub_date')
    list_filter = ('source', 'category', 'pub_date',)
    search_fields = ('title',)


@admin.register(Category) 
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name',)

# StackedInline: Slouží k "vložení" jednoho formuláře do druhého. 
# "Stacked" znamená, že políčka profilu budou seřazena pod sebou.
class ProfileInline(admin.StackedInline):
    model = Profile # Určuje, že tento vložený formulář patří modelu Profile
    can_delete = False # Zakazuje administrátorovi smazat profil bez smazání samotného uživatele
    verbose_name_plural = 'Profile'

# Django má model User zaregistrovaný v administraci už v základu.
# Abychom k němu mohli přidat náš Profil, musíme ho nejdřív "odregistrovat".
admin.site.unregister(User) 

# Dědíme z UserAdmin, abychom neztratili složité funkce (např. hashování hesel).
class CustomUserAdmin(UserAdmin):
    inlines = (ProfileInline, ) 

# Zaregistrujeme model User zpět na web, ale s našimi novými pravidly (CustomUserAdmin)
admin.site.register(User, CustomUserAdmin)