'use client';

import { useState } from 'react';
import { Checkbox } from '@/components/ui/Checkbox';
import { RangeSlider, type RangeValue } from '@/components/ui/RangeSlider';
import { Select } from '@/components/ui/Select';
import { Slider } from '@/components/ui/Slider';
import { Switch } from '@/components/ui/Switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Block } from './Block';

const POWER_TICKS = [
  { value: 1, label: '1' },
  { value: 250, label: '250' },
  { value: 256, label: '256' },
  { value: 263, label: '263' },
];

export function FormsSection() {
  const [power, setPower] = useState(120);
  const [range, setRange] = useState<RangeValue>([10, 40]);
  const [sort, setSort] = useState('name');
  const [checked, setChecked] = useState(true);
  const [on, setOn] = useState(true);

  return (
    <>
      <Block title="Slider (with ticks)" className="w-full max-w-xl flex-col">
        <p className="text-sm">
          Power: <span className="font-pixel">{power}</span>
        </p>
        <Slider
          value={power}
          onValueChange={setPower}
          min={1}
          max={263}
          ticks={POWER_TICKS}
          aria-label="Power level"
        />
      </Block>
      <Block title="RangeSlider" className="w-full max-w-xl flex-col">
        <RangeSlider value={range} onValueChange={setRange} min={0} max={100} label="Damage" />
      </Block>
      <Block title="Select · Checkbox · Switch" className="items-end">
        <div className="w-56">
          <Select
            aria-label="Sort by"
            value={sort}
            onValueChange={setSort}
            options={[
              { value: 'name', label: 'Name' },
              { value: 'damage', label: 'Damage' },
              { value: 'rarity', label: 'Rarity' },
              { value: 'locked', label: 'Unavailable', disabled: true },
            ]}
          />
        </div>
        <Checkbox label="Unique only" hint="12" checked={checked} onCheckedChange={setChecked} />
        <Checkbox label="Indeterminate" checked="indeterminate" />
        <Checkbox label="Disabled" disabled />
        <Switch label="Show approximate" checked={on} onCheckedChange={setOn} />
      </Block>
      <Block title="Tabs" className="w-full max-w-xl">
        <Tabs defaultValue="stats" className="w-full">
          <TabsList aria-label="Item sections">
            <TabsTrigger value="stats">Stats</TabsTrigger>
            <TabsTrigger value="drops">Drops</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>
          <TabsContent value="stats">Stat table goes here.</TabsContent>
          <TabsContent value="drops">Drop locations go here.</TabsContent>
          <TabsContent value="notes">Notes go here.</TabsContent>
        </Tabs>
      </Block>
    </>
  );
}
