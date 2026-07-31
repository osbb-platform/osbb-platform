# 1C debtors export — fixture-derived format notes

Status: evidence for P04/T1  
Fixture: `tests/fixtures/1c/Соборний,186.xls`  
Source names: preserved without anonymization.

## Fixture identity

- Legacy Excel `.xls`, OLE Compound Document.
- Size: `55,808` bytes.
- SHA-256: `0c9dbdcf6c57ea9e46109f8dc8c68cc3668473c1c9fcd7284b156c8ff5df2ff8`.
- Workbook sheets: one sheet named `TDSheet`.
- SheetJS materializes `174 rows × 11 columns` for the worksheet range; the first row is blank and 173 rows contain the report structure/data.
- Merged cells exist in title, group, and total rows.

No parser constant may be expanded beyond the evidence below without another
real fixture proving the new variation.

## Period

The period appears in a title row, not in the table header:

```text
Коротка зведена відомість за Травень 2026 р.
```

Expected extraction:

```text
year = 2026
month = 5
```

## Header

The table header uses rows 9 and 10.

Top-level labels:

```text
Будівля
Площа
Кіл-сть мешк.
Сума на початок місяця
Разом нараховано
Разом сплачено
Сума на кінець місяця
Борг
```

Second header row:

```text
Особ.рахунок
Кв-ра
Квартиронаймач
```

Column mapping:

| Column | Meaning |
|---|---|
| B | account number |
| C | apartment/object label |
| D | owner/tenant name |
| E | area |
| F | resident count |
| G | opening balance |
| H | accrued |
| I | paid |
| J | closing balance |
| K | debt value |

Column F is empty in every detailed row of this fixture.

## Groups and row classes

Observed group rows:

```text
69035, м.Запоріжжя, пр.Соборний (нежитлові), № 186
69035, м.Запоріжжя, пр.Соборний (провайдери), № 186
69035, м.Запоріжжя, пр.Соборний, № 186
```

Required classification:

- group containing `(нежитлові)` → excluded non-residential group;
- group containing `(провайдери)` → excluded provider group;
- plain house-address group → residential data group;
- object labels beginning with `МЗК` → excluded service rows;
- row `Всього:` → total row;
- only account rows inside the residential group are candidate data rows.

Observed counts:

| Class | Count |
|---|---:|
| residential data candidates | 132 |
| all account rows | 159 |
| provider/MZK account rows | 7 |
| non-residential account rows | 20 |
| group rows | 3 |
| total rows | 1 |

## Account numbers

Observed source form:

```text
л/с №609740004
```

Normalization proven by this fixture:

1. trim outer whitespace;
2. remove `л/с`;
3. remove `№`;
4. trim again;
5. accept the remaining digit sequence as the normalized candidate.

Important:

- 158 account numbers contain 9 digits;
- one account contains 8 digits: `60974148`;
- the adapter must not invent a leading zero;
- matching is performed against active `house_apartments.account_number`;
- an unknown normalized account blocks the entire transfer.

## Apartment and object labels

Observed examples:

```text
Кв. 4
Кв. 53А
Кв. 999
Н.п. ...
Оф. ...
МЗК 2
```

Apartment label, owner name, and area from 1C are reconciliation fields only.
The active OSBB apartment registry remains the source of truth.

## Numbers

This fixture stores numeric cells as Excel numeric values, including negatives.

The shared number normalizer must also support text values from future fixtures:

```text
1 234,56
1 234,56
-1 234,56
```

Blank cells normalize to `null`.

## Residential control totals

The residential group total row proves:

| Field | Expected sum |
|---|---:|
| area | 8210.25 |
| opening balance | 446699.57 |
| accrued | 57393.38 |
| paid | 41947.59 |
| closing balance | 462145.36 |
| debt | 404751.98 |

## Whole-file control totals

The final `Всього:` row proves:

| Field | Expected sum |
|---|---:|
| area | 11534.85 |
| opening balance | 521932.27 |
| accrued | 72411.06 |
| paid | 54040.94 |
| closing balance | 540302.39 |
| debt | 467891.33 |

## Debt semantics

`Сума на кінець місяця` and `Борг` are independent source columns.

Examples from the fixture include:

```text
closing = 0;        debt = -375.97
closing = -4522.44; debt = -4980.38
closing = 655.90;   debt = 327.95
```

Therefore:

- never derive `debt_value` from `closing_balance`;
- retain the raw `Борг` value in staging;
- convert to the OSBB signed model in exactly one function:
  `toOsbbBalance`;
- preview must display both the source debt and the resulting OSBB value.

## UI boundary

The debtors workspace receives a compact `1С` icon/button.

The button only opens the reusable import buffer with:

```text
adapterKey = debtors_1c
```

Parsing, normalization, matching, preview state, and transfer logic must remain
inside `src/modules/import-buffer/`, not inside `HouseDebtorsWorkspace`.
