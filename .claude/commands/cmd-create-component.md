# /create-component Command

## Purpose

Scaffold a new Agilearn feature: a component under `src/features/<name>/` plus its
TanStack Query hook in `src/lib/queries/`. No Zustand, no Zod, no i18n — Agilearn
uses none of those. Server state is TanStack Query; keys come from `keys.ts`.

## Usage

```text
/create-component <feature-name>
Example: /create-component announcements
```

## File structure

```text
src/features/<feature-name>/
  <FeatureName>Page.tsx      Main component (thin route renders this)
  <FeatureName>Dialog.tsx    Optional create/edit dialog (Radix)
src/lib/queries/
  <feature-name>.ts          useQuery/useMutation hooks
  keys.ts                    add the feature's key(s) here
```

The route file under `src/routes/**` only wires params/loaders and renders
`<FeatureName>Page/>` — it holds no logic (and is often generated; don't add code there).

---

## Template: query hooks (`src/lib/queries/<feature-name>.ts`)

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { TablesInsert } from "@/lib/database.types";
import { keys } from "./keys";

export function useThings(classroomId: string) {
  return useQuery({
    queryKey: keys.things(classroomId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("things")
        .select("id, classroom_id, name")
        .eq("classroom_id", classroomId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateThing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"things">) => {
      const { data, error } = await supabase.from("things").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (row) => qc.invalidateQueries({ queryKey: keys.things(row.classroom_id) }),
  });
}
```

Add the key to `src/lib/queries/keys.ts` (never inline a tuple):

```typescript
things: (classroomId: string) => ["things", classroomId] as const,
```

---

## Template: component (`src/features/<feature-name>/<FeatureName>Page.tsx`)

```tsx
import { useThings } from "@/lib/queries/things";

interface ThingsPageProps {
  classroomId: string;
}

export function ThingsPage({ classroomId }: ThingsPageProps) {
  const { data, isLoading, error } = useThings(classroomId);

  if (isLoading) return <p>Loading…</p>;
  if (error) return <p role="alert">Couldn’t load things.</p>;

  return (
    <ul className="space-y-2">
      {data?.map((t) => (
        <li key={t.id} className="rounded-md border border-border p-3">
          {t.name}
        </li>
      ))}
    </ul>
  );
}
```

---

## Checklist

- [ ] Component in `src/features/<name>/`; route file stays thin
- [ ] Reads via `useQuery`, writes via `useMutation` invalidating `keys.*` on success
- [ ] Query key added to `src/lib/queries/keys.ts` (no inline tuples)
- [ ] Typed Supabase access (`supabase.from(...)`), aliases from `@/types/domain` / `@/lib/database.types`
- [ ] No grade math here — that lives only in `src/lib/grading.ts`
- [ ] `<select>` has an `aria-label`; buttons use real `disabled` (not `aria-disabled` strings)
- [ ] Tailwind utilities only (no inline `style` for static values, no config file)
