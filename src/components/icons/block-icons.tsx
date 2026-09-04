import type { SVGProps } from 'react';

export type BlockIconProps = SVGProps<SVGSVGElement>;

const IconFrame = ({ children, ...props }: BlockIconProps) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    {children}
  </svg>
);

export const WahIcon = (props: BlockIconProps) => <IconFrame {...props}><path d="M13 36 19 12h15l-5 24H13Z" /><path d="M19 12h15" /><path d="m14 31 15-4" /></IconFrame>;
export const GateIcon = (props: BlockIconProps) => <IconFrame {...props}><path d="M8 39V9m0 30h32" /><path d="M11 34h10c4 0 5-2 5-6V17c0-3 2-5 6-5h5" /><path d="M32 12h5v5" /></IconFrame>;
export const CompressorIcon = (props: BlockIconProps) => <IconFrame {...props}><path d="M8 39V9m0 30h32" /><path d="M11 34 21 24c4-4 7-6 16-6" /><path d="M32 18h5v5" /><path d="M11 34h26" strokeDasharray="3 4" opacity=".55" /></IconFrame>;
export const EfxIcon = (props: BlockIconProps) => <IconFrame {...props}><rect x="11" y="7" width="26" height="34" rx="4" /><circle cx="19" cy="16" r="2.5" /><circle cx="29" cy="16" r="2.5" /><path d="M17 25h14" /><circle cx="24" cy="34" r="3" /></IconFrame>;
export const AmpIcon = (props: BlockIconProps) => <IconFrame {...props}><path d="M9 19h30v21H9z" /><path d="M12 12h24v7H12z" /><path d="M17 15h.01M23 15h.01M29 15h.01" strokeWidth="4" /><path d="M14 24h20M14 29h20M14 34h20" opacity=".65" /></IconFrame>;
export const IrIcon = (props: BlockIconProps) => <IconFrame {...props}><circle cx="21" cy="24" r="13" /><circle cx="21" cy="24" r="5" /><path d="M38 16c3 5 3 11 0 16M42 12c5 8 5 16 0 24" /></IconFrame>;
export const SendReturnIcon = (props: BlockIconProps) => <IconFrame {...props}><path d="M8 16h23" /><path d="m26 11 5 5-5 5" /><path d="M40 32H17" /><path d="m22 27-5 5 5 5" /></IconFrame>;
export const ModulationIcon = (props: BlockIconProps) => <IconFrame {...props}><path d="M7 25c4-14 10-14 17 0s13 14 17 0" /><path d="M7 33c4-14 10-14 17 0s13 14 17 0" opacity=".45" /></IconFrame>;
export const DelayIcon = (props: BlockIconProps) => <IconFrame {...props}><path d="M9 16h19" /><path d="m23 11 5 5-5 5" /><path d="M39 24H18" /><path d="m23 19-5 5 5 5" opacity=".72" /><path d="M9 32h13" /><path d="m17 27 5 5-5 5" opacity=".45" /></IconFrame>;
export const ReverbIcon = (props: BlockIconProps) => <IconFrame {...props}><rect x="10" y="10" width="28" height="28" rx="3" /><rect x="16" y="16" width="16" height="16" rx="2" /><path d="M21 21h6v6h-6z" /></IconFrame>;
export const VolumeIcon = (props: BlockIconProps) => <IconFrame {...props}><path d="M9 21h7l9-7v20l-9-7H9z" /><path d="M31 20c2 2 2 6 0 8M35 16c5 5 5 11 0 16" /></IconFrame>;
export const EqIcon = (props: BlockIconProps) => <IconFrame {...props}><path d="M11 10v28M24 10v28M37 10v28" /><path d="M7 18h8M20 28h8M33 15h8" /></IconFrame>;

const icons = {
  wah: WahIcon,
  'noise-gate': GateIcon,
  compressor: CompressorIcon,
  efx: EfxIcon,
  amp: AmpIcon,
  ir: IrIcon,
  sr: SendReturnIcon,
  modulation: ModulationIcon,
  delay: DelayIcon,
  reverb: ReverbIcon,
  vol: VolumeIcon,
  eq: EqIcon,
} as const;

export function BlockIcon({ type, ...props }: BlockIconProps & { type: keyof typeof icons }) {
  const Icon = icons[type] ?? AmpIcon;
  return <Icon {...props} />;
}
