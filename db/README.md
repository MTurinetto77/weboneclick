# Backup de base de datos `oneclickstore`

## Archivos

| Archivo | Descripción |
|---------|-------------|
| `oneclickstore.sql` | Último backup (copia estable para restore) |
| `oneclickstore-YYYYMMDD-HHMMSS.sql` | Snapshot con fecha/hora |

Generado con MariaDB 10.6 `mysqldump` (`--routines --triggers --single-transaction --databases`).

## Restaurar

```bash
# Desde la raíz del repo (Windows, ajustá la ruta de mysql si hace falta)
"C:\Program Files\MariaDB 10.6\bin\mysql.exe" -u root -proot < db/oneclickstore.sql
```

O en PowerShell:

```powershell
Get-Content db\oneclickstore.sql -Raw | & "C:\Program Files\MariaDB 10.6\bin\mysql.exe" -u root -proot
```

Luego en `web/`:

```bash
npx prisma generate
```

## Volver a generar el backup

```powershell
$mysqldump = "C:\Program Files\MariaDB 10.6\bin\mysqldump.exe"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
& $mysqldump -u root -proot --routines --triggers --single-transaction --databases oneclickstore -r "db\oneclickstore-$stamp.sql"
Copy-Item "db\oneclickstore-$stamp.sql" "db\oneclickstore.sql" -Force
```

Credenciales según `web/.env` → `DATABASE_URL` (por defecto local `root:root@localhost:3306/oneclickstore`).
