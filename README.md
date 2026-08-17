# configurator-lob (frontend de Laurel)

SPA en React + Vite que consume el API de `laurel-infra-manager`. Incluye el
Configurator (schemas/records), el catalogo de Scoops, Cluster y un modulo de
Config Store para ConfigMaps/Secrets vinculados a cada aplicacion.

## Modulos

- **Dashboard** (`/`) — resumen.
- **Configurator** (`/schemas`, `/schema/:id`) — schemas, columns y records.
- **Scoops** (`/scoops`, `/scoops/new`, `/scoops/:id`) — catalogo, deploy, manifests,
  logs, certificados.
- **Config Store** (`/configstore`) — ConfigMaps y Secrets de aplicacion.
  Cada recurso se vincula a un Scoop por su `application`: el nombre por
  convencion es `<app>-config` / `<app>-secret`. En el siguiente deploy del
  scoop se inyectan automaticamente como `envFrom` en el contenedor.
  - **ConfigMaps**: el GET expone los valores para editar facilmente.
  - **Secrets**: los valores **nunca** salen por la API (ni en GET, ni en
    listados, ni en auditorias). Para editar, pega de nuevo todos los pares
    clave/valor: cualquier clave sin valor se elimina.
- **Audits** (`/audits`) — historial de mutaciones.
- **Cluster** (`/cluster`) — vista general del cluster K3s.

## Scripts

```bash
npm run dev      # dev server (Vite)
npm run build    # tsc + vite build
npm run lint     # ESLint
npm run preview  # preview del build
```

