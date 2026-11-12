import { Card, type CardProps } from './Card';

/** A Card with the larger panel radius; used for the Infobox, Forge and Compare. */
export function Panel(props: Omit<CardProps, 'radius'>) {
  return <Card {...props} radius="panel" />;
}
