type FaqItem = {
  question: string;
  answer: string;
};

type FaqProps = {
  items: readonly FaqItem[];
};

export function Faq({ items }: FaqProps) {
  return (
    <section id="duvidas" className="faq-section" aria-labelledby="faq-titulo">
      <div className="section-heading section-heading--centered">
        <p className="eyebrow">DÚVIDAS FREQUENTES</p>
        <h2 id="faq-titulo">Clareza antes de seguir.</h2>
        <p>As respostas acompanham somente as informações confirmadas para a operação.</p>
      </div>
      <div className="faq-list">
        {items.map((item) => (
          <details key={item.question} className="faq-item">
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
