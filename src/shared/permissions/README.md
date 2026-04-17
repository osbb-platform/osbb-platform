# RBAC Foundation — OSBB Platform

Этот каталог является единым source of truth для role-based access control в CMS.

## Текущая иерархия ролей

superadmin
  > admin
    > manager

Inheritance mode:
- superadmin наследует возможности admin
- admin наследует возможности manager
- manager является базовым слоем доступа

---

## Принцип архитектуры

Компоненты, страницы и server actions не должны принимать решения напрямую по role.

Вместо этого они должны опираться на resolved capability access object из RBAC layer.

Правильно:
- access.topLevel.houses
- access.employees.createAdmin
- access.houseWorkspaces.plan.changeWorkflowStatus

Неправильно:
- role === manager
- role === superadmin

---

## Top-level CMS

Ключи:
- dashboard
- districts
- houses
- apartments
- history
- employees
- companyPages
- profile

### Superadmin
- полный доступ
- companyPages: доступен
- passwords в profile не показываем

### Admin
- dashboard: доступ
- districts: полный доступ
- houses: полный доступ
- apartments: полный доступ
- history: просмотр
- employees: полный доступ, кроме superadmin и invite admin
- companyPages: закрыт
- profile: полный доступ
- publish / destructive / snapshot replace: доступны

### Manager
- dashboard: доступ
- houses: доступ
- apartments: только просмотр
- history: просмотр
- profile: просмотр + редактирование своих данных
- companyPages: закрыт
- employees: только просмотр
- districts: скрыт как рабочий раздел

---

## House workspace policy for manager

### Editable
- announcements
- information
- plan
- meetings
- specialists
- debtors

Actions:
- view
- create
- edit
- saveDraft

Дополнительно:
- plan: changeWorkflowStatus
- meetings: changeWorkflowStatus
- announcements: changeWorkflowStatus

### Readonly
- board
- reports
- requisites

---

## Publish boundary

Manager никогда не может:
- publish
- confirm
- archive
- restore
- delete
- replace active snapshot
- mutate security sensitive actions

Это доступно только admin+

---

## Special rule: workflow status

changeWorkflowStatus != publish

Это capability внутреннего перемещения карточки по workflow внутри workspace:
- План работ
- Собрания
- Объявления

---

## Update rule

При изменении ролей:
1. обновить rbac.config.ts
2. обновить README.md
3. потом мигрировать UI / routes / actions
