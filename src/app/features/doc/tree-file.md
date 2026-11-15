Get-ChildItem -Path src/app -Recurse -File | ForEach-Object { $_.FullName.Replace((Get-Location).Path + '\', '') }

app -Recurse -File | ForEach-Object { $_.FullName.Replace((Get-Location).Path + '\', '') }
src\app\app.config.ts
src\app\app.html
src\app\app.routes.ts
src\app\app.scss
src\app\app.spec.ts
src\app\app.ts
src\app\core\models\action-board.model.ts
src\app\core\models\horizon.model.ts
src\app\core\models\sentry-health.model.ts
src\app\core\models\subscription.model.ts
src\app\core\services\action-board.service.ts
src\app\core\services\horizon.service.ts
src\app\core\services\sentry-health.service.ts
src\app\core\services\subscription.service.ts
src\app\features\action-board\action-board.html
src\app\features\action-board\action-board.scss
src\app\features\action-board\action-board.spec.ts
src\app\features\action-board\action-board.ts
src\app\features\doc\reference-linked-stores.md
src\app\features\doc\reference.md
src\app\features\health\health-view\health-view.html
src\app\features\health\health-view\health-view.scss
src\app\features\health\health-view\health-view.spec.ts
src\app\features\health\health-view\health-view.ts
src\app\features\horizon\horizon-radar\horizon-radar.html
src\app\features\horizon\horizon-radar\horizon-radar.scss
src\app\features\horizon\horizon-radar\horizon-radar.spec.ts
src\app\features\horizon\horizon-radar\horizon-radar.ts
src\app\features\subscriptions\subscription-list\subscription-list.html
src\app\features\subscriptions\subscription-list\subscription-list.scss
src\app\features\subscriptions\subscription-list\subscription-list.spec.ts
src\app\features\subscriptions\subscription-list\subscription-list.ts
src\app\shared\components\icon.component.ts

curl -X GET hhttps://gsis-lookup.bbmseries.workers.dev/admin/subscriptions \
  -H "x-admin-key: W759TVu-!XWq/."

  fetch("https://gsis-lookup.bbmseries.workers.dev/admin/subscriptions", {
  headers: { "x-admin-key": "W759TVu-!XWq//." }
})
.then(r => r.json())
.then(data => console.log("SUCCESS:", data))
.catch(err => console.error("FAILED:", err));