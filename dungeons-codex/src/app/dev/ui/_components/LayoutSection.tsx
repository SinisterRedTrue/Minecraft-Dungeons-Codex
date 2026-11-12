import { Reveal } from '@/components/layout/Reveal';
import { WaveDivider } from '@/components/layout/WaveDivider';
import { Card } from '@/components/ui/Card';
import { Block } from './Block';

export function LayoutSection() {
  return (
    <>
      <Block title="WaveDivider · bg-stone" className="w-full flex-col gap-0">
        <div className="bg-stone w-full border border-line bg-bg p-8">
          <p className="text-muted">bg → bg-2 (with the optional stone texture on this band)</p>
        </div>
        <WaveDivider to="bg-2" className="-mt-px" />
        <div className="w-full border border-t-0 border-line bg-bg-2 p-8">
          <p className="text-muted">bg-2 band</p>
        </div>
      </Block>
      <Block title="Reveal (scroll-in, staggered 40 ms)" className="w-full">
        {[0, 1, 2, 3].map((i) => (
          <Reveal key={i} index={i} className="w-48">
            <Card>Card {i + 1}</Card>
          </Reveal>
        ))}
      </Block>
    </>
  );
}
