"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { SubFooter, SubHeader } from "../../../section-shell";

type Recognition = {
  id: number;
  folio: string;
  sequence: number;
  program: "DPL1" | "DPL2";
  year: number;
  full_name: string;
  conocer_folio: string;
  sent_at: string | null;
  printed_at: string | null;
  delivered_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

type RecognitionData = {
  items: Recognition[];
  summary: { total: number; pendingSend: number; pendingPrint: number; delivered: number; archived: number };
};

type ImportPreviewRow = {
  row: number;
  fullName: string;
  program: string;
  year: number;
  conocerFolio: string;
  error: string;
};

const emptyData: RecognitionData = {
  items: [],
  summary: { total: 0, pendingSend: 0, pendingPrint: 0, delivered: 0, archived: 0 },
};

const templates: Record<string, string> = {
  "DPL1-2022": "/universidad/reconocimientos/dpl1-2022.jpg",
  "DPL1-2025": "/universidad/reconocimientos/dpl1-2025.jpg",
  "DPL1-2026": "/universidad/reconocimientos/dpl1-2026.jpg",
  "DPL2-2022": "/universidad/reconocimientos/dpl2-2025.jpg",
  "DPL2-2025": "/universidad/reconocimientos/dpl2-2025.jpg",
  "DPL2-2026": "/universidad/reconocimientos/dpl2-2025.jpg",
};

async function readJson(response: Response) {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "No fue posible completar la operación.");
  return data;
}

function dateLabel(value: string | null) {
  if (!value) return "Pendiente";
  const date = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
  return Number.isNaN(date.valueOf())
    ? value
    : date.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

function verificationUrl(folio: string) {
  return `https://fgdll.org/reconocimientos/${encodeURIComponent(folio)}`;
}

function normalizedHeader(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").replace(/[^a-z0-9]+/g, " ").trim();
}

function readColumn(row: Record<string, unknown>, names: string[]) {
  const wanted = new Set(names.map(normalizedHeader));
  const entry = Object.entries(row).find(([key]) => wanted.has(normalizedHeader(key)));
  return entry?.[1] ?? "";
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function createQr(folio: string) {
  return QRCode.toDataURL(verificationUrl(folio), {
    width: 700,
    margin: 2,
    color: { dark: "#071f41", light: "#ffffff" },
  });
}

async function downloadPdf(item: Recognition) {
  const [{ jsPDF }, background, qr] = await Promise.all([
    import("jspdf"),
    loadImage(templates[`${item.program}-${item.year}`]),
    createQr(item.folio),
  ]);
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter", compress: true });
  const width = 279.4;
  const height = 215.9;
  pdf.addImage(background, "JPEG", 0, 0, width, height, undefined, "FAST");

  if (item.program === "DPL2" && item.year !== 2025) {
    pdf.setFillColor(246, 242, 231);
    pdf.rect(52, 75, 176, 24, "F");
    pdf.setTextColor(22, 22, 20);
    pdf.setFont("times", "normal");
    pdf.setFontSize(14);
    pdf.text("POR HABER CONCLUIDO SATISFACTORIAMENTE EL", width / 2, 83, { align: "center" });
    pdf.setFont("times", "bold");
    pdf.setFontSize(17);
    pdf.text(`DIPLOMADO EN LIDERAZGO EFECTIVO II - ${item.year}`, width / 2, 92, { align: "center" });
  }

  pdf.setTextColor(3, 31, 66);
  pdf.setFont("helvetica", "bold");
  let nameSize = 22;
  pdf.setFontSize(nameSize);
  while (pdf.getTextWidth(item.full_name.toUpperCase()) > 205 && nameSize > 14) {
    nameSize -= 1;
    pdf.setFontSize(nameSize);
  }
  pdf.text(item.full_name.toUpperCase(), width / 2, 118, { align: "center" });
  pdf.setDrawColor(180, 133, 10);
  pdf.setLineWidth(0.45);
  pdf.line(72, 122.5, 207, 122.5);

  // La plantilla queda intacta: se agregan el QR y el folio institucional abajo y al centro.
  pdf.addImage(qr, "PNG", 130.7, 158.5, 18, 18);
  pdf.setTextColor(3, 31, 66);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(5.2);
  pdf.text(item.folio, width / 2, 180.5, { align: "center" });
  pdf.save(`${item.folio}-${item.full_name.replace(/[^\p{L}\p{N}]+/gu, "-")}.pdf`);
}

export function RecognitionDashboard() {
  const [data, setData] = useState<RecognitionData>(emptyData);
  const [selected, setSelected] = useState<Recognition | null>(null);
  const [previewQr, setPreviewQr] = useState("");
  const [program, setProgram] = useState<"DPL1" | "DPL2">("DPL1");
  const [year, setYear] = useState(2026);
  const [draftName, setDraftName] = useState("");
  const [draftConocer, setDraftConocer] = useState("");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"active" | "archived">("active");
  const [importRows, setImportRows] = useState<ImportPreviewRow[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const result = (await fetch("/api/admin/recognitions", { cache: "no-store" }).then(readJson)) as RecognitionData;
      setData(result);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible cargar los reconocimientos.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const isArchivedView = view === "archived";
    setSelected((current) => {
      const refreshed = current ? data.items.find((item) => item.id === current.id) : null;
      if (refreshed && Boolean(refreshed.archived_at) === isArchivedView) return refreshed;
      return data.items.find((item) => Boolean(item.archived_at) === isArchivedView) || null;
    });
  }, [data.items, view]);

  useEffect(() => {
    if (!selected) {
      setPreviewQr("");
      return;
    }
    void createQr(selected.folio).then(setPreviewQr);
  }, [selected]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es");
    const isArchivedView = view === "archived";
    return data.items.filter((item) => {
      if (Boolean(item.archived_at) !== isArchivedView) return false;
      return !term || `${item.full_name} ${item.folio} ${item.program} ${item.year} ${item.conocer_folio}`
        .toLocaleLowerCase("es")
        .includes(term);
    });
  }, [data.items, search, view]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("create");
    setMessage("");
    try {
      const result = await fetch("/api/admin/recognitions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ program, year, fullName: draftName, conocerFolio: draftConocer }),
      }).then(readJson);
      setDraftName("");
      setDraftConocer("");
      setView("active");
      setMessage(`Reconocimiento ${result.recognition.folio} registrado.`);
      await load();
      setSelected(result.recognition);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible registrar el reconocimiento.");
    } finally {
      setBusy("");
    }
  }

  async function mark(item: Recognition, action: "sent" | "printed" | "delivered" | "archive" | "unarchive") {
    setBusy(`${action}-${item.id}`);
    setMessage("");
    try {
      await fetch("/api/admin/recognitions", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: item.id, action }),
      }).then(readJson);
      if (action === "archive" || action === "unarchive") setSelected(null);
      await load();
      if (action === "archive") setMessage(`El reconocimiento ${item.folio} fue archivado.`);
      if (action === "unarchive") setMessage(`El reconocimiento ${item.folio} volvió a la lista activa.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible actualizar el reconocimiento.");
    } finally {
      setBusy("");
    }
  }

  async function remove(item: Recognition) {
    const confirmed = window.confirm(
      `¿Eliminar permanentemente el reconocimiento ${item.folio} de ${item.full_name}?\n\nEsta acción no se puede deshacer y el folio dejará de validarse.`,
    );
    if (!confirmed) return;
    setBusy(`delete-${item.id}`);
    setMessage("");
    try {
      await fetch("/api/admin/recognitions", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      }).then(readJson);
      setSelected(null);
      await load();
      setMessage(`El reconocimiento ${item.folio} fue eliminado permanentemente.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No fue posible eliminar el reconocimiento.");
    } finally {
      setBusy("");
    }
  }

  async function readImportFile(file: File | undefined) {
    if (!file) return;
    setImportMessage("");
    setImportRows([]);
    setImportFileName(file.name);
    if (file.size > 8 * 1024 * 1024) {
      setImportMessage("El archivo supera 8 MB. Divide la lista en archivos más pequeños.");
      return;
    }
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!firstSheet) throw new Error("El archivo no contiene una hoja legible.");
      const sourceRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "", raw: false });
      const parsed = sourceRows.flatMap<ImportPreviewRow>((row, index) => {
        const fullName = String(readColumn(row, ["Nombre completo", "Nombre", "Participante"])).trim().replace(/\s+/g, " ");
        const rawProgram = String(readColumn(row, ["Programa", "Diplomado"])).toUpperCase().replace(/[^A-Z0-9]/g, "");
        const rawYear = String(readColumn(row, ["Año", "Anio", "Generación", "Generacion"])).replace(/[^0-9]/g, "");
        const conocerFolio = String(readColumn(row, ["Folio CONOCER", "CONOCER", "Folio conocer"])).trim().toUpperCase();
        if (!fullName && !rawProgram && !rawYear && !conocerFolio) return [];
        const year = Number(rawYear);
        const problems: string[] = [];
        if (fullName.length < 4) problems.push("Falta el nombre completo");
        if (!(["DPL1", "DPL2"] as string[]).includes(rawProgram)) problems.push("El programa debe ser DPL1 o DPL2");
        if (![2022, 2025, 2026].includes(year)) problems.push("El año debe ser 2022, 2025 o 2026");
        return [{ row: index + 2, fullName, program: rawProgram, year, conocerFolio, error: problems.join(". ") }];
      });
      if (!parsed.length) throw new Error("No se encontraron participantes. Revisa los encabezados de la plantilla.");
      setImportRows(parsed);
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : "No fue posible leer el archivo.");
    }
  }

  async function downloadImportTemplate() {
    const XLSX = await import("xlsx");
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Nombre completo", "Programa", "Año", "Folio CONOCER"],
      ["José Montañez", "DPL1", 2026, ""],
    ]);
    sheet["!cols"] = [{ wch: 34 }, { wch: 14 }, { wch: 10 }, { wch: 22 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Participantes");
    XLSX.writeFile(workbook, "Plantilla_reconocimientos_FGDLL.xlsx");
  }

  async function importValidRows() {
    const validRows = importRows.filter((row) => !row.error);
    if (!validRows.length) return;
    setBusy("import");
    setImportMessage("");
    try {
      const result = await fetch("/api/admin/recognitions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items: validRows.map(({ row, fullName, program, year, conocerFolio }) => ({ row, fullName, program, year, conocerFolio })) }),
      }).then(readJson) as { created: Recognition[]; errors: { row: number; error: string }[] };
      const serverErrors = new Map(result.errors.map((error) => [error.row, error.error]));
      const unresolved = importRows
        .filter((row) => row.error || serverErrors.has(row.row))
        .map((row) => ({ ...row, error: row.error || serverErrors.get(row.row) || "No fue posible registrar esta fila." }));
      setImportRows(unresolved);
      setView("active");
      await load();
      setImportMessage(`${result.created.length} reconocimiento${result.created.length === 1 ? "" : "s"} registrado${result.created.length === 1 ? "" : "s"}.${unresolved.length ? ` ${unresolved.length} fila${unresolved.length === 1 ? " necesita" : "s necesitan"} corrección.` : ""}`);
      if (!unresolved.length) setImportFileName("");
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : "No fue posible importar los participantes.");
    } finally {
      setBusy("");
    }
  }

  const preview = draftName.trim()
    ? {
        id: 0,
        folio: "SE ASIGNARÁ AL GUARDAR",
        sequence: 0,
        program,
        year,
        full_name: draftName,
        conocer_folio: draftConocer,
        sent_at: null,
        printed_at: null,
        delivered_at: null,
        archived_at: null,
        created_at: "",
        updated_at: "",
      } satisfies Recognition
    : selected;
  const displayQr = preview?.id ? previewQr : "";

  return (
    <>
      <SubHeader label="Universidad · Reconocimientos" />
      <main className="recognition-admin-page">
        <section className="recognition-admin-bar">
          <div className="shell">
            <div><span>UNIVERSIDAD FGDLL</span><h1>Reconocimientos</h1></div>
            <div><Link href="/administracion/universidad">← Volver a Universidad</Link><strong>{data.summary.total}</strong><small>emitidos</small></div>
          </div>
        </section>

        <section className="section recognition-workspace">
          <div className="shell">
            <div className="recognition-summary">
              <article><span>TOTAL</span><strong>{data.summary.total}</strong><small>reconocimientos registrados</small></article>
              <article><span>POR ENVIAR</span><strong>{data.summary.pendingSend}</strong><small>entrega digital pendiente</small></article>
              <article><span>POR IMPRIMIR</span><strong>{data.summary.pendingPrint}</strong><small>impresión pendiente</small></article>
              <article className="complete"><span>ENTREGADOS</span><strong>{data.summary.delivered}</strong><small>proceso concluido</small></article>
            </div>

            {message && <div className="admin-message">{message}</div>}

            <div className="recognition-create-grid">
              <form onSubmit={create} className="recognition-form">
                <header><span>ALTA INDIVIDUAL</span><h2>Registrar participante</h2></header>
                <div className="recognition-form-grid">
                  <label>Programa<select value={program} onChange={(event) => setProgram(event.target.value as "DPL1" | "DPL2")}><option>DPL1</option><option>DPL2</option></select></label>
                  <label>Año<select value={year} onChange={(event) => setYear(Number(event.target.value))}><option value="2022">2022</option><option value="2025">2025</option><option value="2026">2026</option></select></label>
                  <label className="wide">Nombre completo<input required value={draftName} onChange={(event) => setDraftName(event.target.value)} placeholder="Nombre tal como aparecerá en el reconocimiento" /></label>
                  <label className="wide">Folio CONOCER <small>Opcional</small><input value={draftConocer} onChange={(event) => setDraftConocer(event.target.value)} placeholder="Ej. D-19784221" /></label>
                </div>
                <button className="button button-gold" disabled={busy === "create"}>{busy === "create" ? "Asignando folio…" : "Registrar y asignar folio"}</button>
              </form>

              <section className="recognition-preview-panel">
                <header>
                  <div><span>VISTA PREVIA</span><h2>{preview ? preview.folio : "Selecciona o registra un reconocimiento"}</h2></div>
                  {preview?.id ? <button onClick={() => void downloadPdf(preview)}>Descargar PDF</button> : null}
                </header>
                {preview ? (
                  <div className="recognition-preview">
                    <img src={templates[`${preview.program}-${preview.year}`]} alt="Vista previa del reconocimiento" />
                    {preview.program === "DPL2" && preview.year !== 2025 && <div className="recognition-preview-program"><small>POR HABER CONCLUIDO SATISFACTORIAMENTE EL</small><b>DIPLOMADO EN LIDERAZGO EFECTIVO II - {preview.year}</b></div>}
                    <strong>{preview.full_name.toUpperCase()}</strong>
                    <div className="recognition-preview-code">
                      {displayQr ? <img src={displayQr} alt="Código QR de validación" /> : <span>QR</span>}
                      <small>{preview.folio}</small>
                    </div>
                  </div>
                ) : <div className="recognition-preview-empty">La vista previa aparecerá aquí.</div>}
              </section>
            </div>

            <section className="recognition-import-panel">
              <header>
                <div><span>REGISTRO EN LOTE</span><h2>Importar participantes desde Excel</h2></div>
                <button type="button" onClick={() => void downloadImportTemplate()}>Descargar plantilla Excel</button>
              </header>
              <div className="recognition-import-body">
                <div className="recognition-import-drop">
                  <label>
                    <strong>Seleccionar archivo</strong>
                    <small>Excel (.xlsx o .xls) y CSV. Máximo 200 participantes.</small>
                    <input type="file" accept=".xlsx,.xls,.csv" onChange={(event) => void readImportFile(event.target.files?.[0])} />
                  </label>
                  {importFileName && <p><b>{importFileName}</b><span>{importRows.filter((row) => !row.error).length} listas · {importRows.filter((row) => row.error).length} con observaciones</span></p>}
                </div>
                {importMessage && <div className="recognition-import-message">{importMessage}</div>}
                {importRows.length > 0 && (
                  <>
                    <div className="recognition-import-preview">
                      <table>
                        <thead><tr><th>Fila</th><th>Nombre completo</th><th>Programa</th><th>Año</th><th>Folio CONOCER</th><th>Revisión</th></tr></thead>
                        <tbody>{importRows.slice(0, 12).map((row) => <tr key={row.row} className={row.error ? "invalid" : "valid"}><td>{row.row}</td><td>{row.fullName || "—"}</td><td>{row.program || "—"}</td><td>{row.year || "—"}</td><td>{row.conocerFolio || "Opcional"}</td><td>{row.error || "Lista para importar"}</td></tr>)}</tbody>
                      </table>
                    </div>
                    {importRows.length > 12 && <small className="recognition-import-more">Se muestran 12 de {importRows.length} filas.</small>}
                    <div className="recognition-import-actions">
                      <button type="button" onClick={() => { setImportRows([]); setImportFileName(""); setImportMessage(""); }}>Cancelar</button>
                      <button type="button" className="button button-gold" disabled={busy === "import" || !importRows.some((row) => !row.error)} onClick={() => void importValidRows()}>{busy === "import" ? "Registrando…" : `Registrar ${importRows.filter((row) => !row.error).length} válidos`}</button>
                    </div>
                  </>
                )}
              </div>
            </section>

            <section className="recognition-table-panel">
              <header>
                <div><span>REGISTRO INSTITUCIONAL</span><h2>{view === "active" ? "Reconocimientos activos" : "Reconocimientos archivados"}</h2></div>
                <div className="recognition-table-toolbar">
                  <div className="recognition-view-toggle" role="group" aria-label="Vista de reconocimientos">
                    <button className={view === "active" ? "active" : ""} onClick={() => setView("active")}>Activos</button>
                    <button className={view === "archived" ? "active" : ""} onClick={() => setView("archived")}>Archivados ({data.summary.archived})</button>
                  </div>
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nombre, folio, programa o año…" />
                </div>
              </header>
              <div className="recognition-table-wrap">
                <table>
                  <thead><tr><th>Participante</th><th>Programa</th><th>Folio institucional</th><th>Envío</th><th>Impresión</th><th>Entrega</th><th>Acciones</th></tr></thead>
                  <tbody>
                    {filtered.map((item) => (
                      <tr key={item.id} className={selected?.id === item.id ? "selected" : ""}>
                        <td><button className="participant-link" onClick={() => setSelected(item)}>{item.full_name}</button>{item.conocer_folio && <small>CONOCER {item.conocer_folio}</small>}</td>
                        <td><b>{item.program}</b><small>{item.year}</small></td>
                        <td><Link href={`/reconocimientos/${item.folio}`} target="_blank">{item.folio}</Link></td>
                        <td><button disabled={Boolean(item.sent_at) || Boolean(item.archived_at) || busy === `sent-${item.id}`} onClick={() => void mark(item, "sent")}>{item.sent_at ? `Enviado · ${dateLabel(item.sent_at)}` : "Marcar enviado"}</button></td>
                        <td><button disabled={Boolean(item.printed_at) || Boolean(item.archived_at) || busy === `printed-${item.id}`} onClick={() => void mark(item, "printed")}>{item.printed_at ? `Impreso · ${dateLabel(item.printed_at)}` : "Marcar impreso"}</button></td>
                        <td><button disabled={Boolean(item.delivered_at) || Boolean(item.archived_at) || busy === `delivered-${item.id}`} onClick={() => void mark(item, "delivered")}>{item.delivered_at ? `Entregado · ${dateLabel(item.delivered_at)}` : "Marcar entregado"}</button></td>
                        <td>
                          <div className="recognition-actions">
                            <button onClick={() => setSelected(item)}>Vista previa</button>
                            <button onClick={() => void downloadPdf(item)}>PDF</button>
                            <button disabled={busy === `archive-${item.id}` || busy === `unarchive-${item.id}`} onClick={() => void mark(item, item.archived_at ? "unarchive" : "archive")}>{item.archived_at ? "Restaurar" : "Archivar"}</button>
                            <button className="danger" disabled={busy === `delete-${item.id}`} onClick={() => void remove(item)}>Eliminar</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!filtered.length && <tr><td colSpan={7}><div className="empty-panel">{view === "archived" ? "No hay reconocimientos archivados." : "Todavía no hay reconocimientos que coincidan con esta búsqueda."}</div></td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </section>
      </main>
      <SubFooter />
    </>
  );
}
