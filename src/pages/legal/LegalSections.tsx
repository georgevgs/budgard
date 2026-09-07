export type LegalSection = {
  heading: string;
  paragraphs: string[];
};

type LegalSectionsProps = {
  sections: LegalSection[];
};

// Renders the i18n-driven body of a legal page: numbered-free, scannable
// sections with generous spacing between them (larger than within, so each
// topic reads as its own group).
export const LegalSections = ({ sections }: LegalSectionsProps) => (
  <div className="mt-10 space-y-10">{sections.map(renderSection)}</div>
);
// --- Helpers ---

const renderSection = (section: LegalSection) => (
  <section key={section.heading} className="space-y-3">
    <h2 className="text-lg font-semibold tracking-tight">{section.heading}</h2>
    {section.paragraphs.map(renderParagraph)}
  </section>
);

const renderParagraph = (paragraph: string) => (
  <p key={paragraph} className="text-[15px] leading-relaxed text-foreground/85">
    {paragraph}
  </p>
);
