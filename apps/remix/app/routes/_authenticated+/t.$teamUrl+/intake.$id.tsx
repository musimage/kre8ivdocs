import { useSession } from "@documenso/lib/client-only/providers/session";
import { mapSecondaryIdToTemplateId } from "@documenso/lib/utils/envelope";
import {
  formatDocumentsPath,
  formatTemplatesPath,
} from "@documenso/lib/utils/teams";
import type { TFieldMetaPrefillFieldsSchema } from "@documenso/lib/types/field-meta";
import { trpc } from "@documenso/trpc/react";
import { cn } from "@documenso/ui/lib/utils";
import { Button } from "@documenso/ui/primitives/button";
import { Spinner } from "@documenso/ui/primitives/spinner";
import { useToast } from "@documenso/ui/primitives/use-toast";
import { FieldType } from "@prisma/client";
import { CheckIcon, ChevronLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";

import {
  EXECUTIVE_DIRECTOR_OPTIONS,
  INTAKE_CHECKBOX_LABELS,
  INTAKE_SECTIONS,
  INTAKE_TEXT_LABELS,
  type IntakeSection,
  getCheckboxKey,
} from "~/components/general/intake/intake-label-map";
import { useCurrentTeam } from "~/providers/team";

import type { Route } from "./+types/intake.$id";

type Role = "guardian" | "student" | "staff" | "director" | "other";

const getRole = (name: string): Role => {
  const n = name.toLowerCase();
  if (n.includes("guardian") || n.includes("parent")) return "guardian";
  if (n.includes("student") || n.includes("youth")) return "student";
  if (n.includes("director")) return "director";
  if (n.includes("staff")) return "staff";
  return "other";
};

type Person = { name: string; email: string };

type SavedState = {
  values: Record<string, string>;
  checks: Record<string, boolean>;
  people: Record<string, Person>;
  directorEmail: string;
};

type TextItem = {
  kind: "text";
  id: number;
  section: IntakeSection;
  label: string;
  multiline: boolean;
  placeholder?: string;
  inputMode?: "text" | "tel" | "email" | "numeric";
  originalLabel?: string;
  originalPlaceholder?: string;
};

type CheckGroupItem = {
  kind: "checks";
  group: string;
  section: IntakeSection;
  single: boolean;
  options: { id: number; label: string; value: string }[];
};

type Item = TextItem | CheckGroupItem;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputClass =
  "block w-full rounded-lg border border-input bg-background px-3 py-3 text-base text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40";

export default function IntakeFormPage({ params }: Route.ComponentProps) {
  const team = useCurrentTeam();
  const { user } = useSession();
  const navigate = useNavigate();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const {
    data: envelope,
    isLoading,
    isError,
  } = trpc.envelope.get.useQuery({ envelopeId: params.id }, { retry: false });

  const { mutateAsync: createDocumentFromTemplate } =
    trpc.template.createDocumentFromTemplate.useMutation();
  const { mutateAsync: deleteRecipient } =
    trpc.envelope.recipient.delete.useMutation();

  const storageKey = `kre8ivdocs-intake:${team.id}:${params.id}`;

  const [values, setValues] = useState<Record<string, string>>({});
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [directorEmail, setDirectorEmail] = useState(
    EXECUTIVE_DIRECTOR_OPTIONS[0].email,
  );
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const recipients = useMemo(
    () =>
      [...(envelope?.recipients ?? [])]
        .sort((a, b) => a.id - b.id)
        .map((r) => ({ ...r, role: getRole(r.name) })),
    [envelope],
  );

  const guardian =
    recipients.find((r) => r.role === "guardian") ?? recipients[0];

  // Load saved progress once.
  useEffect(() => {
    if (!envelope || loaded) return;

    const defaults: Record<string, Person> = {};
    for (const r of recipients) {
      defaults[r.id] =
        r.role === "staff"
          ? { name: user.name ?? "", email: user.email }
          : { name: "", email: "" };
    }

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const saved: SavedState = JSON.parse(raw);
        setValues(saved.values ?? {});
        setChecks(saved.checks ?? {});
        setPeople({ ...defaults, ...(saved.people ?? {}) });
        if (saved.directorEmail) setDirectorEmail(saved.directorEmail);
        setLoaded(true);
        return;
      }
    } catch {
      // Ignore broken saved data.
    }

    setPeople(defaults);
    setLoaded(true);
  }, [envelope, loaded, recipients, storageKey, user.email, user.name]);

  // Save progress locally on every change.
  useEffect(() => {
    if (!loaded) return;
    const state: SavedState = { values, checks, people, directorEmail };
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // Storage full or blocked; the form still works.
    }
  }, [values, checks, people, directorEmail, loaded, storageKey]);

  const items = useMemo<Item[]>(() => {
    if (!envelope || !guardian) return [];

    const fields = envelope.fields
      // Fill-in fields may belong to staff (who fills first) or the guardian.
      .filter((f) => f.type === FieldType.TEXT || f.type === FieldType.CHECKBOX)
      .sort(
        (a, b) =>
          a.page - b.page ||
          Number(a.positionY) - Number(b.positionY) ||
          Number(a.positionX) - Number(b.positionX),
      );

    const result: Item[] = [];
    const groups = new Map<string, CheckGroupItem>();

    for (const field of fields) {
      const meta = (field.fieldMeta ?? {}) as {
        label?: string;
        placeholder?: string;
        readOnly?: boolean;
        values?: { value: string }[];
      };

      if (meta.readOnly) continue;

      if (field.type === FieldType.TEXT) {
        const mapped = meta.label ? INTAKE_TEXT_LABELS[meta.label] : undefined;
        result.push({
          kind: "text",
          id: field.id,
          section: mapped?.section ?? "other",
          label:
            mapped?.label ?? meta.label ?? `Text field (page ${field.page})`,
          multiline: mapped?.multiline ?? false,
          placeholder: mapped?.placeholder,
          inputMode: mapped?.inputMode,
          originalLabel: meta.label,
          originalPlaceholder: meta.placeholder,
        });
        continue;
      }

      const key = getCheckboxKey(
        field.page,
        Number(field.positionX),
        Number(field.positionY),
      );
      const mapped = INTAKE_CHECKBOX_LABELS[key];
      const groupName = mapped?.group ?? `Checkboxes (page ${field.page})`;
      const groupKey = `${mapped?.section ?? "other"}:${groupName}`;
      const value = meta.values?.[0]?.value ?? "";

      let group = groups.get(groupKey);
      if (!group) {
        group = {
          kind: "checks",
          group: groupName,
          section: mapped?.section ?? "other",
          single: mapped?.single ?? false,
          options: [],
        };
        groups.set(groupKey, group);
        result.push(group);
      }

      group.options.push({
        id: field.id,
        label: mapped?.label ?? meta.label ?? "Check",
        value,
      });
    }

    return result;
  }, [envelope, guardian]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-32">
        <Spinner />
      </div>
    );
  }

  if (isError || !envelope || envelope.type !== "TEMPLATE") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-lg">This template could not be found.</p>
        <Button asChild className="mt-6">
          <Link to={formatTemplatesPath(team.url)}>Back to templates</Link>
        </Button>
      </div>
    );
  }

  const setPerson = (id: number, patch: Partial<Person>) =>
    setPeople((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { name: "", email: "" }), ...patch },
    }));

  const toggle = (group: CheckGroupItem, id: number) =>
    setChecks((prev) => {
      const next = { ...prev };
      const on = !prev[id];
      if (group.single && on) {
        for (const o of group.options) next[o.id] = false;
      }
      next[id] = on;
      return next;
    });

  const guardianPerson = guardian ? people[guardian.id] : undefined;
  const guardianOk =
    Boolean(guardianPerson?.name.trim()) &&
    EMAIL_RE.test(guardianPerson?.email.trim() ?? "");

  const otherErrors = recipients.some((r) => {
    const p = people[r.id];
    if (!p || r.role === "director" || r.role === "guardian") return false;
    if (r.role === "student")
      return Boolean(p.email.trim()) && !EMAIL_RE.test(p.email.trim());
    return !EMAIL_RE.test(p.email.trim());
  });

  const clearForm = () => {
    if (!window.confirm("Clear all answers on this device?")) return;
    window.localStorage.removeItem(storageKey);
    setValues({});
    setChecks({});
    setLoaded(false);
  };

  const onSubmit = async () => {
    setShowErrors(true);
    if (!guardianOk || otherErrors) {
      toast({
        title: "Check the recipients",
        description: "Guardian name and email are required.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const director =
        EXECUTIVE_DIRECTOR_OPTIONS.find((d) => d.email === directorEmail) ??
        EXECUTIVE_DIRECTOR_OPTIONS[0];
      let studentToRemove: number | undefined;

      const recipientInputs = recipients.flatMap((r) => {
        if (r.role === "director")
          return [{ id: r.id, email: director.email, name: director.name }];
        const p = people[r.id] ?? { name: "", email: "" };
        if (r.role === "student" && !p.email.trim()) {
          studentToRemove = r.id;
          return [];
        }
        return [{ id: r.id, email: p.email.trim(), name: p.name.trim() }];
      });

      const prefillFields: TFieldMetaPrefillFieldsSchema[] = [];
      for (const item of items) {
        if (item.kind === "text") {
          const value = (values[item.id] ?? "").trim();
          if (value) {
            prefillFields.push({
              id: item.id,
              type: "text",
              label: item.originalLabel,
              placeholder: item.originalPlaceholder,
              value,
            });
          }
        } else {
          for (const o of item.options) {
            if (checks[o.id])
              prefillFields.push({
                id: o.id,
                type: "checkbox",
                value: [o.value],
              });
          }
        }
      }

      const { envelopeId } = await createDocumentFromTemplate({
        templateId: mapSecondaryIdToTemplateId(envelope.secondaryId),
        recipients: recipientInputs,
        distributeDocument: false,
        prefillFields,
      });

      if (studentToRemove !== undefined) {
        // Draft recipients are created in the same order as the template's.
        const index = recipients.findIndex((r) => r.id === studentToRemove);
        const draft = await utils.envelope.get.fetch({ envelopeId });
        const draftRecipient = [...draft.recipients].sort(
          (a, b) => a.id - b.id,
        )[index];
        if (draftRecipient) {
          await deleteRecipient({ recipientId: draftRecipient.id });
        }
      }

      window.localStorage.removeItem(storageKey);

      toast({
        title: "Draft created",
        description: "Review it, then press Send. Nothing has been sent.",
      });

      await navigate(`${formatDocumentsPath(team.url)}/${envelopeId}/edit`);
    } catch (err) {
      console.error(err);
      toast({
        title: "Could not create the draft",
        description: "Your answers are still saved on this device. Try again.",
        variant: "destructive",
      });
      setSubmitting(false);
    }
  };

  const roleTitle: Record<Role, string> = {
    guardian: "Guardian (required)",
    student: "Student (optional; leave email blank if the student has none)",
    staff: "KRE8ivU Staff",
    director: "Final signer",
    other: "",
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-32 text-base">
      <Link
        to={`${formatTemplatesPath(team.url)}/${envelope.id}`}
        className="flex items-center text-documenso-700 hover:opacity-80"
      >
        <ChevronLeft className="mr-1 h-5 w-5" />
        Template
      </Link>

      <h1 className="mt-4 font-semibold text-2xl">Fill in form</h1>
      <p className="mt-1 text-muted-foreground">{envelope.title}</p>
      <p className="mt-2 text-muted-foreground text-sm">
        Answers save on this device as you type. Submitting creates a draft for
        review. Nothing is sent until you press Send.
      </p>

      <section className="mt-8 rounded-xl border p-4">
        <h2 className="font-semibold text-lg">Recipients</h2>

        {recipients.map((r) => {
          const p = people[r.id] ?? { name: "", email: "" };

          if (r.role === "director") {
            return (
              <fieldset key={r.id} className="mt-6">
                <legend className="font-medium">
                  {roleTitle.director}: Executive Director
                </legend>
                <div className="mt-2 grid gap-2">
                  {EXECUTIVE_DIRECTOR_OPTIONS.map((d) => (
                    <label
                      key={d.email}
                      className={cn(
                        "flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-4 py-3",
                        directorEmail === d.email &&
                          "border-primary bg-primary/10",
                      )}
                    >
                      <input
                        type="radio"
                        name="director"
                        className="h-5 w-5"
                        checked={directorEmail === d.email}
                        onChange={() => setDirectorEmail(d.email)}
                      />
                      <span>
                        {d.name}{" "}
                        <span className="text-muted-foreground text-sm">
                          ({d.email})
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            );
          }

          const required = r.role !== "student";
          const nameErr = showErrors && r.role === "guardian" && !p.name.trim();
          const emailErr =
            showErrors &&
            ((required && !EMAIL_RE.test(p.email.trim())) ||
              (!required && p.email.trim() && !EMAIL_RE.test(p.email.trim())));

          return (
            <fieldset key={r.id} className="mt-6">
              <legend className="font-medium">
                {roleTitle[r.role] || r.name}
              </legend>
              <div className="mt-2 grid gap-3">
                <label className="block">
                  <span className="text-muted-foreground text-sm">Name</span>
                  <input
                    className={cn(inputClass, nameErr && "border-destructive")}
                    value={p.name}
                    autoComplete="off"
                    onChange={(e) => setPerson(r.id, { name: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="text-muted-foreground text-sm">
                    Email{required ? " *" : ""}
                  </span>
                  <input
                    className={cn(inputClass, emailErr && "border-destructive")}
                    type="email"
                    inputMode="email"
                    autoComplete="off"
                    value={p.email}
                    onChange={(e) => setPerson(r.id, { email: e.target.value })}
                  />
                </label>
              </div>
            </fieldset>
          );
        })}
      </section>

      {INTAKE_SECTIONS.map((section) => {
        const sectionItems = items.filter((i) => i.section === section.id);
        if (sectionItems.length === 0) return null;

        return (
          <section key={section.id} className="mt-8 rounded-xl border p-4">
            <h2 className="font-semibold text-lg">{section.title}</h2>
            {section.hint && (
              <p className="mt-1 text-muted-foreground text-sm">
                {section.hint}
              </p>
            )}

            <div className="mt-4 grid gap-5">
              {sectionItems.map((item) =>
                item.kind === "text" ? (
                  <label key={item.id} className="block">
                    <span className="font-medium">{item.label}</span>
                    {item.multiline ? (
                      <textarea
                        className={cn(inputClass, "mt-1 min-h-32")}
                        rows={5}
                        value={values[item.id] ?? ""}
                        placeholder={item.placeholder}
                        onChange={(e) =>
                          setValues((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                      />
                    ) : (
                      <input
                        className={cn(inputClass, "mt-1")}
                        value={values[item.id] ?? ""}
                        placeholder={item.placeholder}
                        inputMode={item.inputMode}
                        autoComplete="off"
                        onChange={(e) =>
                          setValues((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                      />
                    )}
                  </label>
                ) : (
                  <fieldset key={`${item.section}:${item.group}`}>
                    <legend className="font-medium">{item.group}</legend>
                    <div className="mt-2 grid gap-2">
                      {item.options.map((o) => {
                        const on = Boolean(checks[o.id]);
                        return (
                          <button
                            key={o.id}
                            type="button"
                            role="checkbox"
                            aria-checked={on}
                            onClick={() => toggle(item, o.id)}
                            className={cn(
                              "flex min-h-12 w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-base",
                              on && "border-primary bg-primary/10",
                            )}
                          >
                            <span
                              className={cn(
                                "flex h-6 w-6 shrink-0 items-center justify-center rounded border-2",
                                on
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-muted-foreground",
                              )}
                            >
                              {on && <CheckIcon className="h-4 w-4" />}
                            </span>
                            {o.label}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                ),
              )}
            </div>
          </section>
        );
      })}

      <p className="mt-6 text-muted-foreground text-sm">
        Initials, signatures, printed names and dates are left for each signer.
      </p>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-12 text-base"
            onClick={clearForm}
            disabled={submitting}
          >
            Clear
          </Button>
          <Button
            type="button"
            className="h-12 flex-1 text-base"
            onClick={onSubmit}
            loading={submitting}
          >
            Create draft for review
          </Button>
        </div>
      </div>
    </div>
  );
}
