import {
  ArrowLeftRight,
  ClipboardList,
  Hammer,
  Search,
  SlidersHorizontal,
  Star,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Reveal } from '@/components/layout/Reveal';
import { Card } from '@/components/ui/Card';

const FEATURES: { title: string; text: string; icon: ReactNode }[] = [
  {
    title: 'Filters',
    text: 'Pick a type first, then narrow by stats, properties, rarity, DLC and more. Every filter lives in the URL, so a view can be shared.',
    icon: <SlidersHorizontal size={26} aria-hidden="true" />,
  },
  {
    title: 'Power Forge',
    text: "Slide an item's power level and see its damage or health. Values between documented points are marked Approximate.",
    icon: <Hammer size={26} aria-hidden="true" />,
  },
  {
    title: 'Compare',
    text: 'Set up to four items of one category side by side and see the best value in every row.',
    icon: <ArrowLeftRight size={26} aria-hidden="true" />,
  },
  {
    title: 'Build Planner',
    text: 'Lay out a loadout slot by slot, count enchantment points and share the whole build as a link.',
    icon: <ClipboardList size={26} aria-hidden="true" />,
  },
  {
    title: 'Favorites',
    text: 'Star anything to keep it close. Favorites stay in your browser, with a JSON backup you can export.',
    icon: <Star size={26} aria-hidden="true" />,
  },
  {
    title: 'Search',
    text: 'Find any weapon, mob or enchantment across both games from one box. Press Ctrl or ⌘ + K anywhere.',
    icon: <Search size={26} aria-hidden="true" />,
  },
];

/** "What's inside": the six feature cards, revealing on scroll with a 40 ms stagger. */
export function FeatureCards() {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {FEATURES.map((feature, index) => (
        <Reveal as="li" key={feature.title} index={index}>
          <Card className="h-full transition-transform duration-200 hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
            <div className="mb-4 grid size-12 place-items-center rounded-btn bg-accent/15 text-accent-text">
              {feature.icon}
            </div>
            <h3 className="mb-2 text-h3 font-bold text-text">{feature.title}</h3>
            <p className="text-muted">{feature.text}</p>
          </Card>
        </Reveal>
      ))}
    </ul>
  );
}
