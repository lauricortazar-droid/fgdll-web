import Link from "next/link";
import { findPublicRecognition } from "../../lib/recognition-store";
import { SubFooter, SubHeader } from "../../section-shell";

export const dynamic = "force-dynamic";

export default async function RecognitionValidationPage({ params }: { params: Promise<{ folio: string }> }) {
  const { folio } = await params;
  const recognition = await findPublicRecognition(decodeURIComponent(folio));
  return <><SubHeader label="Validación de reconocimiento" /><main className="recognition-validation-page"><section className="section"><div className="shell">
    {recognition ? <article className="recognition-valid-card"><header><span>✓</span><div><small>DOCUMENTO AUTÉNTICO</small><h1>Reconocimiento validado</h1></div></header><dl><div><dt>Participante</dt><dd>{String(recognition.full_name)}</dd></div><div><dt>Programa</dt><dd>{String(recognition.program)} · {String(recognition.year)}</dd></div><div><dt>Folio institucional</dt><dd>{String(recognition.folio)}</dd></div>{recognition.conocer_folio && <div><dt>Folio CONOCER</dt><dd>{String(recognition.conocer_folio)}</dd></div>}<div><dt>Fecha de registro</dt><dd>{new Date(`${String(recognition.created_at).replace(" ", "T")}Z`).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}</dd></div></dl><p>Este registro confirma que el reconocimiento fue emitido por la Universidad de la Fraternidad Guerreros de la Luz.</p></article> : <article className="recognition-invalid-card"><span>FOLIO NO ENCONTRADO</span><h1>No pudimos validar este reconocimiento.</h1><p>Revisa que el folio esté completo y que coincida exactamente con el impreso en el documento.</p></article>}
    <Link className="recognition-validation-back" href="/universidad">Conocer Universidad FGDLL →</Link>
  </div></section></main><SubFooter /></>;
}
