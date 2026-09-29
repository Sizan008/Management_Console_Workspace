# Update — Multiple New-Page Identifiers & UI Enhancements

**Branch:** `templateDesign` (frontend) · `feature/NewPageIdentifier` (backend/DB)

A workspace can now have **multiple "New" pages** instead of one. Plus UI updates.

---

## 1. Database — run these scripts (Oracle, tablespace `SENTINEL_TBS`)

**Order: A1 → A2 → A3 → A4.** Do **not** run the "add FK" script (superseded — see bottom).

### A1 — Create `META_NEW_PAGE_IDENTIFIER`

```sql
CREATE TABLE META_NEW_PAGE_IDENTIFIER
(
  WORKSPACE_ID        NUMBER(3)     NOT NULL,
  NEW_PAGE_IDENTIFIER VARCHAR2(255) NOT NULL,
  NEW_PAGE_SELECTOR   VARCHAR2(255) NOT NULL,
  DISPLAY_ORDER       NUMBER(3)     DEFAULT 1,
  IS_ACTIVE           NUMBER(1)     DEFAULT 1
)
TABLESPACE SENTINEL_TBS
  PCTFREE 10
  INITRANS 1
  MAXTRANS 255
  STORAGE
  (
    INITIAL 64K
    NEXT 1M
    MINEXTENTS 1
    MAXEXTENTS UNLIMITED
  );

ALTER TABLE META_NEW_PAGE_IDENTIFIER
  ADD CONSTRAINT PK_META_NEW_PAGE_IDENTIFIER
    PRIMARY KEY (WORKSPACE_ID, NEW_PAGE_IDENTIFIER)
  USING INDEX
    TABLESPACE SENTINEL_TBS
    PCTFREE 10
    INITRANS 2
    MAXTRANS 255
    STORAGE
    (
      INITIAL 64K
      NEXT 1M
      MINEXTENTS 1
      MAXEXTENTS UNLIMITED
    );

ALTER TABLE META_NEW_PAGE_IDENTIFIER
  ADD CONSTRAINT FK_NEW_PAGE_IDENT_WORKSPACE
    FOREIGN KEY (WORKSPACE_ID)
    REFERENCES META_WORKSPACE (WORKSPACE_ID);

COMMENT ON TABLE  META_NEW_PAGE_IDENTIFIER                        IS 'Lookup table for new-page identifiers associated with a workspace';
COMMENT ON COLUMN META_NEW_PAGE_IDENTIFIER.WORKSPACE_ID           IS 'References META_WORKSPACE.WORKSPACE_ID';
COMMENT ON COLUMN META_NEW_PAGE_IDENTIFIER.NEW_PAGE_IDENTIFIER    IS 'Display label shown in the select list on the workspace UI';
COMMENT ON COLUMN META_NEW_PAGE_IDENTIFIER.NEW_PAGE_SELECTOR      IS 'Selector value used to drive behaviour when the identifier is chosen';
COMMENT ON COLUMN META_NEW_PAGE_IDENTIFIER.DISPLAY_ORDER          IS 'Order in which the entry appears in the select list (ascending)';
COMMENT ON COLUMN META_NEW_PAGE_IDENTIFIER.IS_ACTIVE              IS '1 = active (visible in UI), 0 = inactive (hidden)';
```

### A2 — Seed existing data (run before dropping columns, or workspaces lose their create page)

```sql
INSERT INTO META_NEW_PAGE_IDENTIFIER
  (WORKSPACE_ID, NEW_PAGE_IDENTIFIER, NEW_PAGE_SELECTOR, DISPLAY_ORDER, IS_ACTIVE)
SELECT WORKSPACE_ID, NEW_PAGE_IDENTIFIER, NEW_PAGE_SELECTOR, 1, 1
FROM   META_WORKSPACE
WHERE  NEW_PAGE_IDENTIFIER IS NOT NULL;
COMMIT;
```

### A3 — Drop `NEW_PAGE_SELECTOR` from `META_WORKSPACE`

```sql
ALTER TABLE META_WORKSPACE DROP COLUMN NEW_PAGE_SELECTOR;

COMMENT ON COLUMN META_WORKSPACE.NEW_PAGE_IDENTIFIER
  IS 'Selected new-page identifier; valid values are maintained in META_NEW_PAGE_IDENTIFIER for the same WORKSPACE_ID';

COMMIT;
```

### A4 — Drop `NEW_PAGE_IDENTIFIER` from `META_WORKSPACE`

```sql
ALTER TABLE META_WORKSPACE DROP COLUMN NEW_PAGE_IDENTIFIER;

COMMIT;
```

### ⛔ Do NOT run — `002_META_WORKSPACE_add_fk_new_page_identifier.sql`

Conflicts with A4 (can't keep an FK on a dropped column). Superseded design. Kept for reference only:

```sql
-- DO NOT RUN — superseded, conflicts with A4
ALTER TABLE META_WORKSPACE
  ADD CONSTRAINT FK_WORKSPACE_NEW_PAGE_IDENT
    FOREIGN KEY (WORKSPACE_ID, NEW_PAGE_IDENTIFIER)
    REFERENCES META_NEW_PAGE_IDENTIFIER (WORKSPACE_ID, NEW_PAGE_IDENTIFIER);
COMMIT;
```

---

## 2. Backend — code

Package: `com.leads.microcube.sentinel.workspace`

### 2.1 New sub-package `newpageidentifier`

**`newpageidentifier/NewPageIdentifierService.java`**
```java
package com.leads.microcube.sentinel.workspace.newpageidentifier;

import com.leads.microcube.sentinel.workspace.newpageidentifier.command.CreateNewPageIdentifier;
import com.leads.microcube.sentinel.workspace.newpageidentifier.command.UpdateNewPageIdentifier;
import com.leads.microcube.sentinel.workspace.newpageidentifier.query.NewPageIdentifier;
import java.util.List;

public interface NewPageIdentifierService {
  List<NewPageIdentifier> getByWorkspaceId(Long workspaceId);
  List<NewPageIdentifier> getActiveByWorkspaceId(Long workspaceId);
  NewPageIdentifier save(CreateNewPageIdentifier request);
  NewPageIdentifier update(UpdateNewPageIdentifier request);
  void delete(Long workspaceId, String newPageIdentifier);
}
```

**`newpageidentifier/query/NewPageIdentifier.java`** (read DTO)
```java
package com.leads.microcube.sentinel.workspace.newpageidentifier.query;

public class NewPageIdentifier {
  private Long workspaceId;
  private String newPageIdentifier;
  private String newPageSelector;
  private Integer displayOrder;
  private Integer isActive;

  public Long getWorkspaceId() { return workspaceId; }
  public void setWorkspaceId(Long workspaceId) { this.workspaceId = workspaceId; }

  public String getNewPageIdentifier() { return newPageIdentifier; }
  public void setNewPageIdentifier(String newPageIdentifier) { this.newPageIdentifier = newPageIdentifier; }

  public String getNewPageSelector() { return newPageSelector; }
  public void setNewPageSelector(String newPageSelector) { this.newPageSelector = newPageSelector; }

  public Integer getDisplayOrder() { return displayOrder; }
  public void setDisplayOrder(Integer displayOrder) { this.displayOrder = displayOrder; }

  public Integer getIsActive() { return isActive; }
  public void setIsActive(Integer isActive) { this.isActive = isActive; }
}
```

**`newpageidentifier/command/CreateNewPageIdentifier.java`** (single-row create payload)
```java
package com.leads.microcube.sentinel.workspace.newpageidentifier.command;

public class CreateNewPageIdentifier {
  private Long workspaceId;
  private String newPageIdentifier;
  private String newPageSelector;
  private Integer displayOrder;
  private Integer isActive;

  public Long getWorkspaceId() { return workspaceId; }
  public void setWorkspaceId(Long workspaceId) { this.workspaceId = workspaceId; }

  public String getNewPageIdentifier() { return newPageIdentifier; }
  public void setNewPageIdentifier(String newPageIdentifier) { this.newPageIdentifier = newPageIdentifier; }

  public String getNewPageSelector() { return newPageSelector; }
  public void setNewPageSelector(String newPageSelector) { this.newPageSelector = newPageSelector; }

  public Integer getDisplayOrder() { return displayOrder; }
  public void setDisplayOrder(Integer displayOrder) { this.displayOrder = displayOrder; }

  public Integer getIsActive() { return isActive; }
  public void setIsActive(Integer isActive) { this.isActive = isActive; }
}
```

**`newpageidentifier/command/UpdateNewPageIdentifier.java`** (single-row update payload — same fields as create)
```java
package com.leads.microcube.sentinel.workspace.newpageidentifier.command;

public class UpdateNewPageIdentifier {
  private Long workspaceId;
  private String newPageIdentifier;
  private String newPageSelector;
  private Integer displayOrder;
  private Integer isActive;

  public Long getWorkspaceId() { return workspaceId; }
  public void setWorkspaceId(Long workspaceId) { this.workspaceId = workspaceId; }

  public String getNewPageIdentifier() { return newPageIdentifier; }
  public void setNewPageIdentifier(String newPageIdentifier) { this.newPageIdentifier = newPageIdentifier; }

  public String getNewPageSelector() { return newPageSelector; }
  public void setNewPageSelector(String newPageSelector) { this.newPageSelector = newPageSelector; }

  public Integer getDisplayOrder() { return displayOrder; }
  public void setDisplayOrder(Integer displayOrder) { this.displayOrder = displayOrder; }

  public Integer getIsActive() { return isActive; }
  public void setIsActive(Integer isActive) { this.isActive = isActive; }
}
```

**`newpageidentifier/command/NewPageIdentifierItem.java`** (nested item inside a workspace payload — no `workspaceId`)
```java
package com.leads.microcube.sentinel.workspace.newpageidentifier.command;

public class NewPageIdentifierItem {
  private String newPageIdentifier;
  private String newPageSelector;
  private Integer displayOrder;
  private Integer isActive;

  public String getNewPageIdentifier() { return newPageIdentifier; }
  public void setNewPageIdentifier(String newPageIdentifier) { this.newPageIdentifier = newPageIdentifier; }

  public String getNewPageSelector() { return newPageSelector; }
  public void setNewPageSelector(String newPageSelector) { this.newPageSelector = newPageSelector; }

  public Integer getDisplayOrder() { return displayOrder; }
  public void setDisplayOrder(Integer displayOrder) { this.displayOrder = displayOrder; }

  public Integer getIsActive() { return isActive; }
  public void setIsActive(Integer isActive) { this.isActive = isActive; }
}
```

**`newpageidentifier/repository/NewPageIdentifierRepository.java`** — must expose these two methods (used by `WorkspaceServiceImpl`):
```java
List<NewPageIdentifierEntity> findByWorkspaceIdAndIsActiveOrderByDisplayOrderAsc(Long workspaceId, Integer isActive);
void deleteByWorkspaceId(Long workspaceId);
```

### 2.2 Change existing workspace classes

Remove the scalar `newPageIdentifier` / `newPageSelector` fields; add the list.

**`query/Workspace.java`** — add:
```java
import com.leads.microcube.sentinel.workspace.newpageidentifier.query.NewPageIdentifier;
import java.util.List;

private List<NewPageIdentifier> newPageIdentifiers;

public List<NewPageIdentifier> getNewPageIdentifiers() { return newPageIdentifiers; }
public void setNewPageIdentifiers(List<NewPageIdentifier> newPageIdentifiers) { this.newPageIdentifiers = newPageIdentifiers; }
```

**`command/CreateWorkspace.java`** and **`command/UpdateWorkspace.java`** — add:
```java
import com.leads.microcube.sentinel.workspace.newpageidentifier.command.NewPageIdentifierItem;
import java.util.List;

private List<NewPageIdentifierItem> newPageIdentifiers;

public List<NewPageIdentifierItem> getNewPageIdentifiers() { return newPageIdentifiers; }
public void setNewPageIdentifiers(List<NewPageIdentifierItem> newPageIdentifiers) { this.newPageIdentifiers = newPageIdentifiers; }
```

### 2.3 `WorkspaceServiceImpl` — create/update/read logic

```java
@Override
@Transactional
public Workspace saveWorkspace(CreateWorkspace request) {
  WorkspaceEntity entity = toEntity(request);
  WorkspaceEntity saved = workspaceRepository.save(entity);
  saveNewPageIdentifiers(saved.getWorkspaceId(), request.getNewPageIdentifiers());
  return toQuery(saved);
}

@Override
@Transactional
public Workspace updateWorkspace(UpdateWorkspace request) {
  WorkspaceEntity entity = workspaceRepository.findById(request.getWorkspaceId())
          .orElseThrow(() -> CustomException.notFound(
                  "Workspace not found with id: " + request.getWorkspaceId()));
  entity.setAppId(request.getAppId());
  entity.setWorkspaceName(request.getWorkspaceName());
  entity.setWorkspaceDesc(request.getWorkspaceDesc());
  entity.setSearchIdentifier(request.getSearchIdentifier());
  entity.setSearchSelector(request.getSearchSelector());
  entity.setHomeIdentifier(request.getHomeIdentifier());
  entity.setHomeSelector(request.getHomeSelector());
  entity.setDisplayOrder(request.getDisplayOrder());
  entity.setIsActive(request.getIsActive());
  WorkspaceEntity saved = workspaceRepository.save(entity);

  // replace-all: delete existing rows, then re-insert the incoming list
  newPageIdentifierRepository.deleteByWorkspaceId(saved.getWorkspaceId());
  saveNewPageIdentifiers(saved.getWorkspaceId(), request.getNewPageIdentifiers());

  return toQuery(saved);
}

// DISPLAY_ORDER defaults to loop index, IS_ACTIVE defaults to 1
private void saveNewPageIdentifiers(Long workspaceId, List<NewPageIdentifierItem> items) {
  if (items == null || items.isEmpty()) {
    return;
  }
  int order = 1;
  for (NewPageIdentifierItem item : items) {
    NewPageIdentifierEntity npi = new NewPageIdentifierEntity();
    npi.setWorkspaceId(workspaceId);
    npi.setNewPageIdentifier(item.getNewPageIdentifier());
    npi.setNewPageSelector(item.getNewPageSelector());
    npi.setDisplayOrder(item.getDisplayOrder() != null ? item.getDisplayOrder() : order);
    npi.setIsActive(item.getIsActive() != null ? item.getIsActive() : 1);
    newPageIdentifierRepository.save(npi);
    order++;
  }
}

// in toQuery(...): after mapping the workspace, load ACTIVE identifiers ordered by DISPLAY_ORDER
private Workspace toQuery(WorkspaceEntity entity) {
  Workspace workspace = new Workspace();
  // ... map scalar fields ...
  List<NewPageIdentifier> identifiers = newPageIdentifierRepository
      .findByWorkspaceIdAndIsActiveOrderByDisplayOrderAsc(entity.getWorkspaceId(), 1)
      .stream().map(this::toNewPageIdentifierQuery).toList();
  workspace.setNewPageIdentifiers(identifiers);
  return workspace;
}
```

### 2.4 Endpoints — unchanged, payloads now include the array

| Method | Path |
|---|---|
| GET | `/workspace/get-all` |
| GET | `/workspace/get-by-app-id?appId=` |
| GET | `/workspace/get-by-id/{workspaceId}` |
| POST | `/workspace/create` |
| POST | `/workspace/update` |

Example `create` / `update` body:
```json
{
  "appId": 1,
  "workspaceName": "User Management",
  "homeIdentifier": "user-management",
  "homeSelector": "app-user-cases",
  "displayOrder": 3,
  "isActive": 1,
  "newPageIdentifiers": [
    { "newPageIdentifier": "Register New User", "newPageSelector": "register-user", "displayOrder": 1, "isActive": 1 },
    { "newPageIdentifier": "Bulk Import Users", "newPageSelector": "bulk-import",   "displayOrder": 2, "isActive": 1 }
  ]
}
```

---

## 3. Frontend — what changed

| # | Feature | Files |
|---|---|---|
| 1 | **Multiple new-page selections** — `NewPageDto` + `WorkspaceDto.newPageIdentifiers[]`; `mapToWorkspaces()` builds `masterPages` (drops inactive, sorts by `displayOrder`); admin form manages a list; select field gained `swatchColor` + fixed-position menu | `core/workspace-api/workspace-api.model.ts`, `shared/services/workspace.service.ts`, `shared/features/workspace/workspace.ts`, `shared/common-components/input-types/input-select-option-field/`, `.../generic-workspace/stage-badge.ts` |
| 2 | **"New" button with dropdown** — 1 page = single button, multiple = split button with dropdown of all create pages | `shared/common-components/generic-workspace/generic-workspace.ts` + `.html` |
| 3 | **Action-button wrapper for master pages** — strip under navbar (Save/Update/View/Delete/Reset/Exit); buttons moved out of navbar; auto-resets on route path change | `layout/layouts/action-bar/`, `layout/layout.html`, `layout/layouts/navbar/` |
| 4 | **Common right-panel header** — `<app-panel-page>` shell owns header/scroll-body/footer; slots `[panelSubheader]`, `[panelFooter]` | `shared/common-components/panel-page/panel-page.ts` |
| 5 | **Navbar workspace dropdown** (Config & Function pages) — switcher with favourite/default; navigates first, commits only on success; clears on non-workspace routes | `layout/layouts/navbar/navbar.ts` + `.html`, `shared/services/workspace.service.ts` |
| 6 | **Navbar date display** — transaction-date picker moved to navbar; `OfficeDayService` loads selectable business dates; persists to `sessionStorage.txnDt` | `core/office-day/office-day.service.ts`, `layout/layouts/navbar/` |
| 7 | **Config page filter `functionType = 'C'`** — Config keeps `'C'` items, Functions keeps `'F'` | `feature/config/config-page/config-page.component.ts`, `feature/config/functions-page/functions-page.component.ts` |
| 8 | **Section header redesign** — accent-rail card; `:host` is the card; signal API `panelTitle` / `accentColor` / required `isOpenSignal`; body hidden via CSS (no remount) | `shared/common-components/expansion-panel-header/` |
| 9 | **Advanced search filters** — config-driven modal (`advancedSearch: AdvancedSearchField[]`); Search button opens modal instead of navigating; removable filter chips | `.../generic-workspace/workspace-config.model.ts`, `.../generic-workspace.ts` + `.html`, `feature/user-management/user-cases/user-management.config.ts` |
| 10 | **Profile drawer redesign** — user-initials avatar, branch info from `sessionStorage`, `changeTxnDate()`. Note: `switchBranch()` is a stub | `layout/layouts/sidebar/drawers/profile-drawer/`, `layout/layouts/sidebar/sidebar.html` |
