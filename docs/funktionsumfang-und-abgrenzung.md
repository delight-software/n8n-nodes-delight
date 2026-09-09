# n8n

## Pflege und Zuständigkeit

Diese Datei ist die massgebliche Fachreferenz für n8n. Funktionen, Grenzen und technische Belege werden hier zusammen mit relevanten Quelländerungen gepflegt. Dokumentation und gespeicherte Angaben belegen keine produktive Laufzeitprüfung.

Die [zentrale Website-Sicht](../../../core/docs/website-modules/modules/n8n.md) übernimmt daraus eine redaktionelle Zusammenfassung unter der stabilen ID `n8n`. Core verwaltet Kategorien und gemeinsame Website-Identitäten. Ein lokales Update veröffentlicht keine Website und ändert keine Lizenzzuordnung.

Bei Änderungen zuerst diese Referenz und den tatsächlich geprüften Stand in `source-review.json` aktualisieren. Anschliessend die betroffene zentrale Website-Sicht abgleichen oder die noch ausstehende Übergabe ausdrücklich festhalten. Quelländerungen gezielt prüfen; Prüfsummen nicht ohne fachliche Prüfung erneuern.

## Fachlicher Zweck

Die n8n-Integration verbindet delight-Daten und Dokumente mit konfigurierbaren Automatisierungsabläufen in n8n. Sie richtet sich an Unternehmen, die Daten zwischen delight und weiteren Diensten verarbeiten möchten.

## Funktionen

- Datensätze lesen, gefiltert abfragen, erstellen, aktualisieren und löschen; über Vergleichsfelder bestehende Datensätze erkennen und erstellen oder aktualisieren. [S1]
- E-Mails und Dateien in den Eingang des Dokumentencenters hochladen, mit Optionen für Beantwortung und automatische Zuordnung. [S2]
- Dokumente an einen konkreten Datensatz anhängen und bereits verknüpfte Dokumente herunterladen. [S3]
- Abläufe durch neue oder geänderte Datensätze per zeitgesteuerter Abfrage auslösen. Webhook-Trigger unterstützen Erstellung, Änderung und Löschung. [S4]

## Ablauf und Zusammenspiel

Nach Installation der Community Nodes werden delight-API-Zugang und Schema eingerichtet. Ein Trigger oder ein anderer n8n-Schritt liefert Daten; die Aktion liest oder schreibt passende delight-Datensätze beziehungsweise Dokumente. Weitere Dienste und Feldzuordnungen werden im jeweiligen Workflow konfiguriert. [S1–S4]

## Grenzen und Voraussetzungen

Erforderlich sind eine n8n-Installation mit den delight Community Nodes, eine erreichbare delight REST API und ein berechtigter Benutzer. Webhooks benötigen zusätzlich die Notification-Handler-Konfiguration und einen erreichbaren Empfangsendpunkt. Der Quellstand belegt Bausteine, keine fertig eingerichtete Synchronisation mit jedem Fremdsystem. Aktuelle Plattformkompatibilität, öffentliche Verfügbarkeit und produktiver Betrieb wurden nicht getestet.

## Quellen

Fachlich geprüft am 2026-09-09. Quellstand und SHA-256-Prüfsummen: [source-review.json](source-review.json). Die Fachreferenz wurde aus der gleichentags geprüften Core-Dokumentation übernommen; keine zusätzliche Laufzeitprüfung.

- [S1] [Datensatz-Aktionen](../nodes/Delight/resources/dataset/execute.ts), ergänzend die Implementierungen unter `resources/dataset/actions/`.
- [S2] [Dokumentencenter-Upload](../nodes/Delight/resources/documents-center/actions/create.ts).
- [S3] [Verknüpfte Dokumente](../nodes/Delight/resources/attachedDocument/execute.ts).
- [S4] [Trigger-Auswahl](../nodes/Delight/resources/trigger/fields.ts) und [Webhook-Registrierung](../nodes/Delight/resources/trigger/webhookMethods.ts).
- [Einrichtung und fachliche Beispiele](../README.md).
