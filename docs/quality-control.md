# Qualitätskontrolle (QC vor Versand)

Vor dem Versand durchläuft jeder Druckauftrag eine 6-Punkte-Prüfung mit Fotonachweis.
Ohne bestandene (oder bewusst überschriebene) QC ist kein Versand möglich.

## Datenmodell

**QcRecord** — pro Prüfversuch ein Datensatz (Historie bleibt erhalten): `printerJobId`,
`status`, sechs Booleans (`colorOk`, `surfaceOk`, `dimensionsOk`, `stabilityOk`,
`completenessOk`, `packagingOk`), `note?`, `overrideReason?`, `approvedById?`,
`approvedAt?`. **QcAttachment** hält die Fotos (privat, wie Reklamationsfotos).

Der „aktuelle Stand" eines Jobs ist der **neueste** Record (`createdAt desc, id desc`).

## Statusmaschine (`packages/utils/src/qc-status.ts`)

```
open ─> passed | failed | overridden
failed ─> reprint_required | overridden
passed | reprint_required | overridden (terminal — neuer Versuch = neuer Record)
```

`isQcCleared(status)` = `passed || overridden`. `passed` ist nur zulässig, wenn **alle
sechs** Checklistenpunkte bestätigt sind (sonst `409`).

## QC-Gate (drei Stellen)

1. **Produktion**: `PrinterJob` → `ready_to_ship` wird mit `409` abgewiesen, solange der
   Job nicht QC-cleared ist.
2. **Versand**: `Shipment` `waiting_for_qc` → `ready_for_shipping` prüft alle Jobs hinter
   den Sendungspositionen.
3. Bestellungen ohne Druckjobs (Altbestand) passieren das Gate leer.

`reprint_required` schiebt den Job zurück in die Queue (`quality_check` →
`reprint_needed`, Drucker wird freigegeben) und benachrichtigt intern per
`renderAdminNotification`.

## Override

`POST /api/admin/qc/:id/override` erfordert `qc:override` (**nur Admin**) und eine
Begründung (≥ 10 Zeichen). Beides wird im Audit-Log festgehalten.

## Endpunkte (Admin, RBAC + Audit)

- `GET /api/admin/qc` — Records (filterbar) + `jobsInQc` (Jobs in `quality_check`).
- `POST /api/admin/qc` — Record eröffnen (Job muss `quality_check` sein, kein zweiter
  offener Record).
- `PATCH /api/admin/qc/:id` — Checkliste (nur offene Records).
- `POST /api/admin/qc/:id/status` — `passed` / `failed` / `reprint_required`.
- `POST /api/admin/qc/:id/override` — bewusste Freigabe.
- `POST /api/admin/qc/:id/photos`, `GET /api/admin/qc/:id/attachments/:id`.

## RBAC

`qc:read` / `qc:write` — production (+ shipping liest); `qc:override` ausschließlich Admin.
