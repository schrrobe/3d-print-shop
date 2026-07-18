# Lösch- und Aufbewahrungskonzept

Stand: 13.07.2026 · Geltungsbereich: Shop, API, Datenbank, private Uploads,
Rechnungs-PDFs, E-Mail-Logs und Backups.

Dieses Konzept ist die verbindliche Betriebsvorgabe für die Anwendung. Vor dem
Livegang müssen Unternehmenssitz, Steuerstatus und etwaige abweichende
gesetzliche Pflichten durch Steuer- und Rechtsberatung bestätigt werden.

## Grundsätze

- Daten werden nur für den jeweils beschriebenen Zweck und nicht länger als
  nötig gespeichert.
- Eine gesetzliche Aufbewahrungspflicht oder ein laufender Streitfall,
  Behördenverfahren bzw. eine geltend gemachte Forderung setzt die Löschung
  aus (Löschsperre). Umfang, Grund und Ende der Sperre werden im internen
  Löschprotokoll festgehalten.
- Rechnungen werden weder überschrieben noch gelöscht, solange ihre Frist
  läuft. Korrekturen erfolgen ausschließlich über nachvollziehbare
  Storno-/Korrekturbelege; die Rechnungsnummer bleibt erhalten.
- Produktive Löschläufe werden protokolliert (Zeitpunkt, Regel, Anzahl,
  verantwortliche Person); das Protokoll enthält keine vollständigen
  Kundendaten.

## Fristen

Fristen laufen jeweils bis zum Ende des genannten Zeitraums. Soweit nicht
anders angegeben, beginnt die Frist mit der letzten sachlichen Bearbeitung.

| Datenkategorie                                                    | Zweck                                                                  |                                                            Frist | Maßnahme nach Frist                                                                                             |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------: | --------------------------------------------------------------------------------------------------------------- |
| Rechnungen, Rechnungs-PDFs, zugehörige Bestell- und Zahlungsdaten | Steuer- und Handelsrecht, Buchhaltung                                  |              10 Jahre ab Ende des Kalenderjahres der Ausstellung | Nach Prüfung ohne Löschsperre Datenbankdatensatz und PDF löschen; Sicherung nach Backup-Zyklus auslaufen lassen |
| Bestellungen ohne Rechnung, Versand- und Zahlungsdaten            | Vertragserfüllung, Gewährleistung, Abwehr/ Durchsetzung von Ansprüchen |                     3 Jahre ab Ende des Jahres des Vertragsendes | Personen- und Adressdaten löschen bzw. anonymisieren; nur nicht personenbezogene Kennzahlen behalten            |
| Angebot-/Upload-Anfragen ohne Bestellung                          | Angebotserstellung und Nachfragen                                      |      12 Monate nach Ablehnung, Ablauf oder letzter Kommunikation | Anfrage, Kontaktangaben, Modell-Dateien und gespeicherte Metadaten löschen                                      |
| Modell-Dateien zu nicht beauftragten Uploads                      | technische Angebotsprüfung                                             | 30 Tage nach Ablehnung/Ablauf, spätestens 12 Monate nach Eingang | Dateien im `UPLOAD_DIR` und Metadaten löschen                                                                   |
| Modell-Dateien zu beauftragten Aufträgen                          | Produktion und Reklamationsbearbeitung                                 |                          12 Monate nach Abschluss der Bestellung | Dateien im `UPLOAD_DIR` und Metadaten löschen; bei Reklamation beginnt die Frist nach deren Abschluss neu       |
| Support-Tickets und Reklamationen ohne Rechnungspflicht           | Kundenservice und Anspruchsprüfung                                     |                       3 Jahre ab Ende des Jahres des Abschlusses | Nachrichten, Anhänge und Kontaktangaben löschen bzw. anonymisieren                                              |
| E-Mail-Logs                                                       | Zustellungsnachweis, Fehleranalyse                                     |                                                          90 Tage | Empfänger, Betreff, Payload und Fehler löschen                                                                  |
| Passwort-Reset- und Magic-Link-Token, Zugriffsprotokolle          | Sicherheit und Missbrauchserkennung                                    |                            Token sofort bei Ablauf; Logs 90 Tage | Datensätze löschen                                                                                              |
| Consent-Logs                                                      | Nachweis einer Einwilligung                                            |                        3 Jahre ab Widerruf bzw. letzter Änderung | anonymen Nachweis löschen                                                                                       |

## Löschablauf

1. Ein geplanter, mindestens monatlicher Löschlauf ermittelt nur Datensätze,
   deren Frist abgelaufen ist und für die keine Löschsperre besteht.
2. Vor der Ausführung prüft die verantwortliche Person Stichproben sowie
   offene Reklamationen, Chargebacks und Steuerprüfungen.
3. Dateien werden zuerst aus den privaten Verzeichnissen entfernt, danach die
   verknüpften Datenbankdaten gelöscht oder anonymisiert. Fehlschläge werden
   protokolliert und erneut bearbeitet.
4. Backups werden nicht einzeln verändert: Sie sind verschlüsselt und
   zugriffsbeschränkt. Ihre Aufbewahrungsdauer und das Verfahren für eine
   Wiederherstellung werden vor dem Produktivbetrieb verbindlich im
   Sicherungskonzept festgelegt; bis dahin wird keine maximale Löschfrist für
   Sicherungen zugesagt.
5. Quartalsweise wird das Löschprotokoll geprüft. Die Prüfergebnisse und
   Ausnahmen werden für 3 Jahre dokumentiert.

## Verantwortlichkeiten und Freigaben

- Die Geschäftsführung verantwortet Rechtsgrundlage, Löschsperren und die
  jährliche Überprüfung der Fristen.
- Die technische Administration führt den Löschlauf aus und dokumentiert
  Ergebnis sowie Fehler.
- Ein Auskunfts-, Berichtigungs- oder Löschersuchen wird gegen diese Fristen
  und Sperren geprüft; die Entscheidung und Kommunikation werden im
  Support-Ticket dokumentiert.

## Technische Umsetzung vor Produktion

- Einen authentifizierten, protokollierten Wartungsjob für die obigen Regeln
  implementieren und zunächst im Staging mit Kopie produktiver Strukturen
  testen.
- `UPLOAD_DIR` und `INVOICE_DIR` ausschließlich privat halten; Backups beider
  Verzeichnisse in den regulären Sicherungsplan aufnehmen.
- Löschsperren mit Grund, Beginn und Ende technisch abbilden, bevor der erste
  automatisierte Löschlauf aktiv wird.
