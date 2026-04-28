# Open Dentist

Open-source dental practice management — an alternative to CareStack and Archy for solo practices, group practices, and DSOs.

<img width="1717" height="991" alt="Image" src="https://github.com/user-attachments/assets/dee37adf-633e-41bd-b2de-12753c9709c5" />

> Built on the [Clawnify](https://clawnify.com) template format. Deploy your own copy in minutes, customize freely, own the data.

## Features

### Agenda
- **Multi-room day view** — operatories as columns, 15-minute time slots, drag-friendly card geometry
- **Color-coded appointments** by treatment type, with patient name, DOB, time range, and status
- **Break / lunch / block** placeholders alongside patient appointments
- **Live "now" indicator** on the current day
- Click empty slot → create dialog · click card → edit / delete · prev / today / next navigation

### Patients
Searchable list with a tabbed detail page per patient:

- **Overview** — contact, computed age, medical-alert badges, free-form notes
- **Tooth Chart** — interactive odontogram (FDI numbering) powered by [`react-odontogram`](https://github.com/biomathcode/react-odontogram). Pick a brush (caries / restoration / crown / endo / implant / missing), click teeth to apply, click again to clear. Each condition renders in its own color, with a counted legend
- **Treatment Plan** — items with treatment, tooth, fee, status (planned / accepted / completed / declined). Totals card per status
- **Clinical Notes** — composer + reverse-chronological timeline, attributed to a practitioner
- **Billing** — invoices with billed / paid / balance summary, status dropdown (open / paid / void)

### Behind the scenes
- **Treatment types** — code, default duration, default fee, color
- **Practitioners** — dentist / hygienist / assistant
- **Operatories** — color-coded treatment rooms
- **Waiting list & appointments-to-make** — schema and API in place; UI panels next

## Stack

- React 19 + Vite + TypeScript
- Tailwind CSS v4 + shadcn/ui (Radix primitives)
- Hono on Cloudflare Workers (D1-native — same code locally and in production)
- `react-odontogram` for the interactive tooth chart
- `lucide-react` for icons
- pushState URL routing

## Develop

```bash
pnpm install
pnpm dev          # Vite at :5173, Wrangler at :8787 (D1 schema applied automatically)
pnpm typecheck
pnpm build
```

The dev script applies `src/server/schema.sql` to the local D1 database, then runs Vite and Wrangler in parallel. The schema seeds 3 operatories, 3 practitioners, and 6 treatment types so the agenda is usable on first boot.

## Deploy

If you have the Clawnify CLI installed:

```bash
clawnify deploy
```

Or wire it up to Cloudflare Workers + D1 directly using the bindings in `wrangler.toml` (binding `DB`, database name `open-dentist-db`).

## Project layout

```
src/
  server/
    index.ts        Hono routes for every entity
    db.ts           D1 adapter (query / get / run)
    schema.sql      Tables + seed data
  client/
    app.tsx         Shell + routing
    components/
      agenda/       Day view, day toolbar, appointment card + dialog
      patients/     List, detail page, 5 tabs (overview/chart/plan/notes/billing)
      ui/           Vendored shadcn primitives
    hooks/          use-router, use-app-state
    lib/utils.ts    cn helper, color palette, date/time helpers
```

## License

MIT
