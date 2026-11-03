import { TEMPLATES } from "./domain/templates";

export default function App() {
  return (
    <main className="mx-auto max-w-md p-4">
      <h1 className="text-2xl font-bold">Coffee Timer</h1>
      <ul className="mt-4 space-y-2">
        {TEMPLATES.map((r) => (
          <li key={r.id} className="rounded-lg border p-3">
            {r.name}
          </li>
        ))}
      </ul>
    </main>
  );
}
