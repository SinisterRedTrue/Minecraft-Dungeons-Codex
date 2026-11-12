import { ThemeToggle } from '@/components/layout/ThemeToggle';

// Placeholder until Prompt 06 builds the real Game Picker and header; the toggle lives here so
// the theme behaviour has a page to be exercised on.
export default function HomePage() {
  return (
    <main className="flex flex-col items-start gap-4 p-6">
      <h1 className="text-4xl">Dungeons Codex</h1>
      <ThemeToggle />
    </main>
  );
}
