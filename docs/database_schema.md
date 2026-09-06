## Table `certificados`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id_certificado` | `int4` | Primary Unique |
| `nombre_estudiante` | `varchar` |  |
| `carrera` | `varchar` |  Nullable |
| `hash_certificado` | `varchar` |  |
| `fecha_creacion` | `timestamp` |  Nullable |
| `institucion_id` | `int4` | Primary |
| `fecha_titulacion` | `date` |  Nullable |
| `estado` | `varchar` |  Nullable |
| `codigo` | `varchar` |  Nullable Unique |

## Table `credenciales_fisicas`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary |
| `uid_rfid` | `varchar` |  Nullable |
| `codigo` | `varchar` |  Nullable |
| `fecha_emision_fisica` | `timestamp` |  Nullable |

## Table `instituciones`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `institucion_id` | `int4` | Primary |
| `nombre` | `varchar` |  Nullable |

## Table `certificados_credenciales`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `credenciales_fisicas_id` | `int4` |  |
| `certificados_id` | `int4` | Primary |

## Table `usuarios`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int4` | Primary Identity |
| `created_at` | `timestamptz` |  |
| `auth_user_id` | `uuid` |  Nullable |
| `rol` | `varchar` |  Nullable |
| `institucion_id` | `int4` |  Nullable |
| `nombre` | `varchar` |  Nullable |

## Table `institucion_wallets`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `wallet_id` | `int4` | Primary Identity |
| `created_at` | `timestamptz` |  |
| `institucion_id` | `int4` |  Nullable |
| `address` | `text` |  Nullable Unique |
| `etiqueta` | `text` |  Nullable |


