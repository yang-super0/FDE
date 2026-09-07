interface SectionHeaderProps {
  no: string;
  label: string;
  subtitle?: string;
}

const SectionHeader = ({ no, label, subtitle }: SectionHeaderProps) => {
  return (
    <div className="mb-6">
      <div className="text-[11px] font-black text-primary uppercase tracking-[0.15em] mb-1">
        {no}. {label}
      </div>
      {subtitle ? (
        <div className="text-[10px] text-muted-foreground font-medium">
          {subtitle}
        </div>
      ) : null}
    </div>
  );
};

export { SectionHeader };
export type { SectionHeaderProps };
