type StatusBadgeProps = {
  label: string;
  tone: 'ok' | 'error' | 'pending';
};

function toneClassName(tone: StatusBadgeProps['tone']): string {
  switch (tone) {
    case 'ok':
      return 'badge badge-ok';
    case 'error':
      return 'badge badge-error';
    case 'pending':
      return 'badge badge-pending';
  }
}

export function StatusBadge(props: StatusBadgeProps) {
  const { label, tone } = props;

  return <span className={toneClassName(tone)}>{label}</span>;
}
