# OPEX Control — Windows Local Edition

A Windows desktop application designed for a shared SMB network folder. Runtime architecture: WPF/.NET, local executable, JSON/NDJSON files on the selected network share. No Firebase, Node.js, browser server, hosted database, or cloud runtime.

## Build
- Windows 10/11
- .NET 8 SDK (build machine only)
- Visual Studio 2022 or the .NET CLI

```powershell
dotnet build OPEX.Desktop.sln
dotnet publish src/OPEX.Desktop/OPEX.Desktop.csproj -c Release -r win-x64 --self-contained true /p:PublishSingleFile=true
```

The published executable can run on target Windows workstations without installing the .NET runtime.

## First launch
1. Run OPEX.Desktop.exe.
2. Select the shared UNC path (recommended) such as `\\FILESERVER\OPEX`, or a mapped network drive.
3. The app checks write access and creates the workspace structure.
4. Run the shared-folder write test from the Overview page.

Use a dedicated folder with Windows share and NTFS permissions granted to the intended OPEX user group. Do not store PHI or production-sensitive data until security and recovery testing is complete.

## Current implementation scope
- WPF desktop shell and local-only application entry point.
- Shared-folder bootstrap and write-access probe.
- JSON document persistence, append-only NDJSON primitive, and exclusive lock-file primitive.
- Path traversal protection and temp-file replacement for JSON documents.

## Not yet implemented
Authentication/RBAC, user and team administration, form builder, submission lifecycle, review/pend workflow, dashboards, aggregation, notifications, Excel export, signed audit records, backup scheduler, and full acceptance tests. These are explicit build milestones, not claimed as complete.

## SMB design caveat
SMB locking and rename semantics depend on the file server/NAS and its configuration. The included lock primitive is a starting point, not proof of distributed transaction guarantees. Run multi-workstation contention, crash recovery, permissions, backup/restore, and performance tests against the actual target share before production use. The design does not claim 1,000 concurrent users or one million monthly submissions without measured evidence.
