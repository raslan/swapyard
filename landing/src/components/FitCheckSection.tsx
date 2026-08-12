import { content } from "../content";
import { FitBar } from "./FitBar";

export function FitCheckSection() {
  const { label, title, body } = content.fitCheck;

  return (
    <section className="relative border-t border-edge/70">
      <FitBar label={label} title={title} body={body} />
    </section>
  );
}
