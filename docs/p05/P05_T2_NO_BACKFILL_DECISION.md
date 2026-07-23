# P05 T2 — Contractor directory without legacy backfill

Date: 2026-07-23  
Status: approved

## Final product model

The contractor directory contains frequently used contractors only.

A plan task supports two valid modes:

1. Frequent contractor selected from the directory:
   - `contractor_id` contains the selected contractor ID;
   - `contractor` contains the displayed name snapshot.

2. Arbitrary contractor entered manually:
   - `contractor` contains the entered text;
   - `contractor_id` is `null`.

## Legacy data

Existing `house_plan_tasks.contractor` values remain unchanged.

P05 does not normalize, rewrite, merge, or backfill all historical contractor
values. Historical rows may keep `contractor_id = null`.

The production preview was used only to confirm that the approved initial
20-record directory represents frequently used contractors.

## T3 requirements

T3 must provide:

- searchable selection from active frequent contractors;
- arbitrary text input;
- creation of a new frequent contractor by authorized plan editors;
- nullable `contractor_id`;
- text snapshot persistence in `contractor`;
- no mandatory legacy migration.
