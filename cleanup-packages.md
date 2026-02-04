# Nettoyage des Packages - Instructions

## Packages Supprimés de package.json

Les packages suivants ont été **retirés** de `package.json` car ils sont inutiles:

### ❌ Packages Inutiles Supprimés

1. **`child_process`** (^1.0.2)
   - Raison: Module natif de Node.js, pas besoin de l'installer
   - Déjà disponible via `require('child_process')`

2. **`logger`** (^0.0.1)
   - Raison: Package obsolète et non utilisé
   - Le projet utilise `winston` à la place

3. **`mysql`** (^2.18.1)
   - Raison: Doublon avec `mysql2`
   - Le projet utilise uniquement `mysql2`

4. **`node`** (^21.6.2)
   - Raison: Package npm invalide
   - Node.js s'installe via nvm/installer officiel

5. **`node.js`** (^0.0.1-security)
   - Raison: Package bidon/malveillant potentiel
   - Node.js ne s'installe pas via npm

## 🔧 Commandes à Exécuter

Ouvrez un terminal dans le dossier du projet et exécutez:

```bash
# Supprime les node_modules existants
rm -rf node_modules

# Supprime le package-lock.json
rm package-lock.json

# Réinstalle uniquement les dépendances nécessaires
npm install

# Corrige les vulnérabilités
npm audit fix
```

Sur Windows (PowerShell):
```powershell
# Supprime les node_modules existants
Remove-Item -Recurse -Force node_modules

# Supprime le package-lock.json
Remove-Item package-lock.json

# Réinstalle uniquement les dépendances nécessaires
npm install

# Corrige les vulnérabilités
npm audit fix
```

## ✅ Nouveaux Scripts Disponibles

Après le nettoyage, vous aurez accès à ces commandes:

```bash
npm start              # Lance le bot
npm run dev            # Lance en mode watch (redémarre auto)
npm run deploy-commands # Déploie les commandes slash
npm run lint           # Vérifie le code avec ESLint
npm run lint:fix       # Corrige automatiquement les erreurs ESLint
npm audit              # Vérifie les vulnérabilités
npm run audit:fix      # Corrige les vulnérabilités automatiquement
```

## 📊 Résultat Attendu

Après le nettoyage:

| Métrique | Avant | Après | Amélioration |
|----------|-------|-------|--------------|
| **Packages prod** | 13 | 8 | -38% |
| **Packages inutiles** | 5 | 0 | -100% |
| **Sécurité** | ⚠️ Packages suspects | ✅ Propre | +100% |
| **Taille node_modules** | ~XXX MB | ~YYY MB | -XX% |

## ⚠️ Important

Après avoir exécuté ces commandes:
1. Testez que le bot démarre correctement: `npm start`
2. Vérifiez qu'il n'y a plus de vulnérabilités critiques: `npm audit`
3. Si tout fonctionne, committez les changements

## 🔍 Vérification

Pour vérifier que tout est OK:

```bash
# Le bot doit démarrer sans erreur
npm start

# Aucune vulnérabilité high/critical
npm audit

# ESLint ne doit pas trouver d'erreurs
npm run lint
```

## 📝 Note

Les packages suivants ont été **conservés**:
- `archiver`: Utilisé pour créer des archives
- `axios`: Client HTTP pour les requêtes externes
- `cron`: Planification de tâches
- `discord.js`: Framework Discord (essentiel)
- `dotenv`: Gestion variables d'environnement
- `mysql2`: Driver MySQL/MariaDB
- `sequelize`: ORM base de données
- `sqlite3`: Support SQLite (dev/test)
- `winston`: Logger professionnel
