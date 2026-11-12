'use client';

import { Info } from 'lucide-react';
import { Button3D } from '@/components/ui/Button3D';
import { Dialog, DialogClose, DialogContent, DialogTrigger } from '@/components/ui/Dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { Tooltip } from '@/components/ui/Tooltip';
import { Badge } from '@/components/ui/Badge';
import { Block } from './Block';

export function OverlaysSection() {
  const { toast } = useToast();
  return (
    <Block title="Dialog · Sheet · Tooltip · Popover · Toast">
      <Dialog>
        <DialogTrigger asChild>
          <Button3D variant="stone">Open dialog</Button3D>
        </DialogTrigger>
        <DialogContent title="Dialog title" description="Focus is trapped here; Esc closes it.">
          <p>Dialog body text.</p>
          <div className="mt-6 flex justify-end">
            <DialogClose asChild>
              <Button3D>Got it</Button3D>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
      <Sheet>
        <SheetTrigger asChild>
          <Button3D variant="stone">Open sheet</Button3D>
        </SheetTrigger>
        <SheetContent title="Filters" description="Bottom sheet with a drag handle.">
          <p>Filter controls go here.</p>
        </SheetContent>
      </Sheet>
      <Tooltip content="Numbers from a curve, not the item's own table.">
        <button
          type="button"
          className="inline-flex cursor-pointer"
          aria-label="About approximate values"
        >
          <Badge variant="approximate">
            Approximate <Info size={12} aria-hidden="true" />
          </Badge>
        </button>
      </Tooltip>
      <Popover>
        <PopoverTrigger asChild>
          <Button3D variant="ghost">Open popover</Button3D>
        </PopoverTrigger>
        <PopoverContent>
          <p className="text-sm">Popover content, closes on Esc or outside click.</p>
        </PopoverContent>
      </Popover>
      <Button3D
        variant="gold"
        onClick={() =>
          toast({ title: 'Link copied', description: 'Share it anywhere.', variant: 'success' })
        }
      >
        Toast
      </Button3D>
      <Button3D
        variant="redstone"
        onClick={() =>
          toast({
            title: 'Compare holds up to 4',
            description: 'Remove one first.',
            variant: 'error',
          })
        }
      >
        Error toast
      </Button3D>
    </Block>
  );
}
