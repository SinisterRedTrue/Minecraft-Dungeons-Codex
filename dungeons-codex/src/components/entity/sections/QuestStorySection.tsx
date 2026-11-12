import Link from 'next/link';
import { SectionBlock } from '@/components/entity/SectionBlock';
import type { QuestOrder } from '@/lib/detail/context';
import type { EntityRef } from '@/lib/detail/refs';

function StoryLink({ quest, direction }: { quest: EntityRef; direction: 'Previous' | 'Next' }) {
  return (
    <Link
      href={quest.href}
      className="flex min-h-14 flex-col justify-center rounded-card border-[1.5px] border-line bg-surface-1 px-4 py-2 hover:border-accent"
    >
      <span className="font-pixel text-micro tracking-pixel text-muted uppercase">
        {direction} quest
      </span>
      <span className="font-bold text-text">{quest.name}</span>
    </Link>
  );
}

/** Where a core quest sits in the story, with links to the quests before and after it. */
export function QuestStorySection({ order }: { order: QuestOrder | undefined }) {
  if (!order) return null;
  return (
    <SectionBlock id="story" title="Story order">
      <p className="mb-3 text-text">
        Core quest <strong>{order.position}</strong> of {order.total}.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {order.previous ? <StoryLink quest={order.previous} direction="Previous" /> : <span />}
        {order.next ? <StoryLink quest={order.next} direction="Next" /> : <span />}
      </div>
    </SectionBlock>
  );
}
