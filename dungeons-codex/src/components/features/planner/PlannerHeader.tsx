'use client';

import { Copy, CopyPlus, Save, Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import { Button3D } from '@/components/ui/Button3D';
import type { GameId } from '@/config/games';
import { MAX_POWER } from '@/lib/forge/codec';
import { MAX_NAME, type Build } from '@/lib/planner/schema';
import { DEFAULT_POWER } from '@/lib/planner/summary';

export const FIELD =
  'min-h-11 rounded-sm border border-control bg-surface-2 px-3 text-text placeholder:text-muted hover:border-accent';

export type PlannerHeaderProps = {
  game: GameId;
  build: Build;
  /** Name and power edits go through the planner's one commit path. */
  onChange: (next: Build) => void;
  onName: (value: string) => void;
  onCopyLink: () => void;
  onSave: () => void;
  onDuplicate: () => void;
  onClear: () => void;
};

/** Build name, Power (Dungeons only) and the Copy link / Save / Duplicate / Clear actions. */
export function PlannerHeader({
  game,
  build,
  onChange,
  onName,
  onCopyLink,
  onSave,
  onDuplicate,
  onClear,
}: PlannerHeaderProps) {
  const nameId = useId();
  const powerId = useId();
  // What is typed while the field is being edited; cleared on blur so it shows the clamped value.
  const [powerDraft, setPowerDraft] = useState<string | null>(null);

  const changePower = (text: string) => {
    setPowerDraft(text);
    const value = Number.parseInt(text, 10);
    if (Number.isFinite(value)) {
      onChange({ ...build, power: Math.min(MAX_POWER, Math.max(1, value)) });
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
      <div className="flex min-w-56 flex-1 flex-col gap-1">
        <label htmlFor={nameId} className="text-sm font-semibold text-text">
          Build name
        </label>
        <input
          id={nameId}
          value={build.name ?? ''}
          maxLength={MAX_NAME}
          placeholder="Name your build"
          onChange={(event) => onName(event.target.value)}
          className={FIELD}
        />
      </div>
      {game === 'd1' && (
        <div className="flex flex-col gap-1">
          <label htmlFor={powerId} className="text-sm font-semibold text-text">
            Power
          </label>
          <input
            id={powerId}
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_POWER}
            value={powerDraft ?? String(build.power ?? DEFAULT_POWER)}
            onChange={(event) => changePower(event.target.value)}
            onBlur={() => setPowerDraft(null)}
            className={`${FIELD} w-28`}
          />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button3D size="sm" onClick={onCopyLink} icon={<Copy size={16} aria-hidden="true" />}>
          Copy link
        </Button3D>
        <Button3D
          size="sm"
          variant="gold"
          onClick={onSave}
          icon={<Save size={16} aria-hidden="true" />}
        >
          Save
        </Button3D>
        <Button3D
          size="sm"
          variant="stone"
          onClick={onDuplicate}
          icon={<CopyPlus size={16} aria-hidden="true" />}
        >
          Duplicate
        </Button3D>
        <Button3D
          size="sm"
          variant="stone"
          onClick={onClear}
          icon={<Trash2 size={16} aria-hidden="true" />}
        >
          Clear
        </Button3D>
      </div>
    </div>
  );
}
