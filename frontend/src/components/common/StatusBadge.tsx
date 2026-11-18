import type { Tone } from '../../lib/labels';

type StatusBadgeProps = {
  label: string;
  tone: Tone;
  title?: string;
};

export function StatusBadge(props: StatusBadgeProps) {
  const { label, tone, title } = props;

  return (
    <span className={`badge badge-${tone}`} title={title}>
      {label}
    </span>
  );
}

/** labels.ts의 lookup 결과를 그대로 받아 배지로 그린다. */
export function LabelBadge(props: {
  entry: { label: string; tone: Tone };
  title?: string;
}) {
  return (
    <StatusBadge
      label={props.entry.label}
      tone={props.entry.tone}
      title={props.title}
    />
  );
}
