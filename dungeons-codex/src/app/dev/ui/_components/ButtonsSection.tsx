import { Swords } from 'lucide-react';
import { Button3D, type Button3DSize, type Button3DVariant } from '@/components/ui/Button3D';
import { Block } from './Block';

const VARIANTS: Button3DVariant[] = ['accent', 'gold', 'stone', 'redstone', 'ghost'];
const SIZES: Button3DSize[] = ['sm', 'md', 'lg'];

export function ButtonsSection() {
  return (
    <>
      {SIZES.map((size) => (
        <Block key={size} title={`Button3D · ${size}`}>
          {VARIANTS.map((variant) => (
            <Button3D key={variant} variant={variant} size={size}>
              {variant}
            </Button3D>
          ))}
        </Block>
      ))}
      <Block title="Button3D · icon, disabled, link">
        <Button3D icon={<Swords size={18} aria-hidden="true" />}>With icon</Button3D>
        <Button3D variant="gold" disabled>
          Disabled
        </Button3D>
        <Button3D variant="ghost" disabled>
          Disabled ghost
        </Button3D>
        <Button3D asChild variant="stone">
          <a href="#links">As a link</a>
        </Button3D>
        <Button3D asChild disabled>
          <a href="#disabled-link">Disabled link</a>
        </Button3D>
      </Block>
    </>
  );
}
