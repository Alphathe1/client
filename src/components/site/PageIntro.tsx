import { WRAP } from "./styles";

/** Sober header of the inner pages (spec §5.1): the owner's title and line of context */
export function PageIntro({ title, text }: { title: string; text: string }) {
  return (
    <section className="border-b border-line">
      <div className={`${WRAP} py-12 sm:py-16 lg:py-20`}>
        <h1 className="max-w-3xl text-4xl font-semibold text-text wrap-anywhere sm:text-5xl lg:text-6xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-muted wrap-anywhere">{text}</p>
      </div>
    </section>
  );
}
