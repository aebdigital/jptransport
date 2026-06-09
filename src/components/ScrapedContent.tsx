type ScrapedContentProps = {
  html: string;
};

export function ScrapedContent({ html }: ScrapedContentProps) {
  if (!html) return null;

  return (
    <section className="bg-white px-4 py-14">
      <div className="scraped-content mx-auto max-w-5xl" dangerouslySetInnerHTML={{ __html: html }} />
    </section>
  );
}
