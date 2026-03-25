import React from "react";
import { act } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { ContentCreationPanel, WriteStep } from "@/components/admin/backoffice/ContentCreationPanel";
import { hasContent } from "@/components/admin/backoffice/content/localeContent";
import { resetUnsavedChangesState } from "@/hooks/useUnsavedChanges";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
    i18n: { language: "en", resolvedLanguage: "en" },
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/admin/content",
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/components/admin/backoffice/content/DocEditor", () => ({
  DocEditor: ({ value, onChange, error }: { value: unknown; onChange: (v: any) => void; error?: string; locale?: string }) => (
    <div>
      <textarea
        aria-label="doc-editor"
        value={Array.isArray(value) && value.length > 0 ? "filled" : ""}
        onChange={(e) =>
          onChange(
            e.target.value
              ? [{ _type: "block", _key: "mock", children: [{ _key: "c", text: e.target.value }] }]
              : [],
          )
        }
      />
      {error && <div>{error}</div>}
    </div>
  ),
}));

vi.mock("@/components/admin/backoffice/ImageUploader", () => ({
  ImageUploader: () => <div data-testid="image-uploader" />,
}));

vi.mock("@/components/admin/backoffice/ReferencePicker", () => ({
  ReferencePicker: ({ label }: { label: string }) => <div>{label}</div>,
}));

const EN_BLOCK = [
  { _type: "block", _key: "en", children: [{ _key: "c1", text: "English body" }], markDefs: [], style: "normal" },
] as any;

const renderWriteStep = async (initialValues: Record<string, unknown> = {}) => {
  render(
    <ContentCreationPanel
      mode="insight"
      initialValues={{ title: "Hello", slug: "hello", ...initialValues }}
      onSubmit={async () => ({ success: true })}
      searchAuthors={async () => []}
      searchCategories={async () => []}
    />,
  );

  await act(async () => {
    fireEvent.click(screen.getByText("Next"));
  });
  await waitFor(() => expect(screen.getByText(/Step 2 of 4/)).toBeInTheDocument());

  const volumeInput = within(screen.getByText("Monthly searches").closest("div") as HTMLElement).getByRole("spinbutton");
  return { volumeInput };
};

afterEach(() => {
  // Reset confirm stub and clear spies between tests.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).confirm = undefined;
  window.localStorage.clear();
  resetUnsavedChangesState();
  vi.restoreAllMocks();
});

describe("localeContent helpers", () => {
  it("hasContent returns false when title and body are empty", () => {
    expect(hasContent({ title: "", body: [] as any[] })).toBe(false);
    expect(hasContent({ title: " ", body: [] as any[] })).toBe(false);
  });
});

describe("WriteStep language indicators", () => {
  it("shows empty badge for locale without content", () => {
    render(
      <WriteStep
        heroImageAssetIdField={<div />}
        hasHeroImage={false}
        heroSettingsOpen={false}
        onHeroSettingsOpenChange={() => {}}
        heroAltField={<div />}
        heroCaptionField={<div />}
        heroLayout="standard"
        onHeroLayout={() => {}}
        heroTheme="light"
        onHeroTheme={() => {}}
        title=""
        onTitleChange={() => {}}
        lang="en"
        onLangChange={() => {}}
        localeHasContent={(l) => l === "en"}
        bodyEnField={<div>EN</div>}
        bodyThField={<div>TH</div>}
      />,
    );

    expect(screen.getByText("Empty")).toBeInTheDocument();
  });

  it("hides empty badge when locale has content", () => {
    render(
      <WriteStep
        heroImageAssetIdField={<div />}
        hasHeroImage={false}
        heroSettingsOpen={false}
        onHeroSettingsOpenChange={() => {}}
        heroAltField={<div />}
        heroCaptionField={<div />}
        heroLayout="standard"
        onHeroLayout={() => {}}
        heroTheme="light"
        onHeroTheme={() => {}}
        title="Filled"
        onTitleChange={() => {}}
        lang="en"
        onLangChange={() => {}}
        localeHasContent={() => true}
        bodyEnField={<div>EN</div>}
        bodyThField={<div>TH</div>}
      />,
    );

    expect(screen.queryByText("Empty")).toBeNull();
  });
});

describe("Next step locale confirmation", () => {
  it("prompts when inactive locale is empty", async () => {
    const confirmSpy = vi.fn().mockReturnValue(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).confirm = confirmSpy;

    render(
      <ContentCreationPanel
        mode="insight"
        initialValues={{ title: "Hello", slug: "hello", body: EN_BLOCK, titleTh: "", bodyTh: [] }}
        onSubmit={async () => ({ success: true })}
        searchAuthors={async () => []}
        searchCategories={async () => []}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Next"));
    });
    await waitFor(() => expect(screen.getByText(/Step 2 of 4/)).toBeInTheDocument());

    const volumeInput = within(screen.getByText("Monthly searches").closest("div") as HTMLElement).getByRole("spinbutton");
    fireEvent.change(volumeInput, { target: { value: "300" } });
    fireEvent.blur(volumeInput);

    await act(async () => {
      fireEvent.click(screen.getByText("Next"));
    });
    expect(confirmSpy).toHaveBeenCalled();
    expect(screen.getByText(/Step 2 of 4/)).toBeInTheDocument();
  });

  it("advances without prompt when all locales have content", async () => {
    const confirmSpy = vi.fn().mockReturnValue(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).confirm = confirmSpy;

    render(
      <ContentCreationPanel
        mode="insight"
        initialValues={{
          title: "Hello",
          slug: "hello",
          body: EN_BLOCK,
          titleTh: "หัวข้อไทย",
          bodyTh: EN_BLOCK,
        }}
        onSubmit={async () => ({ success: true })}
        searchAuthors={async () => []}
        searchCategories={async () => []}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Next"));
    });
    await waitFor(() => expect(screen.getByText(/Step 2 of 4/)).toBeInTheDocument());

    const volumeInput = within(screen.getByText("Monthly searches").closest("div") as HTMLElement).getByRole("spinbutton");
    fireEvent.change(volumeInput, { target: { value: "300" } });
    fireEvent.blur(volumeInput);

    await act(async () => {
      fireEvent.click(screen.getByText("Next"));
    });
    await waitFor(() => expect(screen.getByText(/Step 3 of 4/)).toBeInTheDocument());

    expect(confirmSpy).not.toHaveBeenCalled();
  });
});

describe("News wizard smoke test", () => {
  it("renders without crashing", async () => {
    render(
      <ContentCreationPanel
        mode="news"
        initialValues={{
          _id: "news-1",
          title: "Hello",
          slug: "hello",
          category: "general",
          publishDate: new Date().toISOString(),
          locale: "en",
        }}
        onSubmit={async () => ({ success: true, id: "news-1" })}
        searchEvents={async () => []}
        basePath="/admin/content/news"
      />,
    );

    expect(await screen.findByText("Create news")).toBeInTheDocument();
  });
});

describe("Monthly searches validation", () => {
  it("shows error for negative values", async () => {
    const { volumeInput } = await renderWriteStep();

    fireEvent.change(volumeInput, { target: { value: "-100" } });
    fireEvent.blur(volumeInput);

    expect(await screen.findByText("Must be a positive whole number")).toBeInTheDocument();
  });

  it("shows error for non-numeric input", async () => {
    const { volumeInput } = await renderWriteStep();

    fireEvent.change(volumeInput, { target: { value: "many" } });
    fireEvent.blur(volumeInput);

    expect(await screen.findByText("Must be a positive whole number")).toBeInTheDocument();
  });

  it("shows error for zero", async () => {
    const { volumeInput } = await renderWriteStep();

    fireEvent.change(volumeInput, { target: { value: "0" } });
    fireEvent.blur(volumeInput);

    expect(await screen.findByText("Must be a positive whole number")).toBeInTheDocument();
  });

  it("allows advancing when value is valid", async () => {
    render(
      <ContentCreationPanel
        mode="insight"
        initialValues={{
          title: "Hello",
          slug: "hello",
          titleTh: "หัวข้อไทย",
          body: EN_BLOCK,
          bodyTh: EN_BLOCK,
        }}
        onSubmit={async () => ({ success: true })}
        searchAuthors={async () => []}
        searchCategories={async () => []}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Next"));
    });
    await waitFor(() => expect(screen.getByText(/Step 2 of 4/)).toBeInTheDocument());

    const volumeInput = within(screen.getByText("Monthly searches").closest("div") as HTMLElement).getByRole("spinbutton");
    fireEvent.change(volumeInput, { target: { value: "300" } });
    fireEvent.blur(volumeInput);

    expect(screen.queryByText("Must be a positive whole number")).toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByText("Next"));
    });
    await waitFor(() => expect(screen.getByText(/Step 3 of 4/)).toBeInTheDocument());
  });
});

describe("Editor state resets for new insights", () => {
  it("starts with empty body even when a saved draft exists", async () => {
    window.localStorage.setItem(
      "autosave:ncs-ecom:insight:new",
      JSON.stringify({ body: [{ _type: "block", _key: "saved", children: [], markDefs: [], style: "normal" }] }),
    );

    await renderWriteStep();

    const bodyInput = screen.getByLabelText("doc-editor") as HTMLTextAreaElement;
    expect(bodyInput.value).toBe("");
  });
});

describe("Hero alt text counter", () => {
  const goToWriteStepWithHero = async () => {
    render(
      <ContentCreationPanel
        mode="insight"
        initialValues={{ title: "Hello", slug: "hello", heroImageAssetId: "asset-1" }}
        onSubmit={async () => ({ success: true })}
        searchAuthors={async () => []}
        searchCategories={async () => []}
      />,
    );

    fireEvent.click(screen.getByText("Next"));
    await screen.findByText(/Step 2 of 4/);

    const altInput = screen.getByPlaceholderText("Describe the image for screen readers");
    return { altInput };
  };

  it("shows live counter and warning after 125 characters", async () => {
    const { altInput } = await goToWriteStepWithHero();

    expect(screen.getByText("0 / 125 chars")).toBeInTheDocument();

    await act(async () => {
      fireEvent.change(altInput, { target: { value: "hello world" } });
      await waitFor(() => expect(screen.getByText("11 / 125 chars")).toBeInTheDocument());
    });
    const warning = screen.getByText(/Screen readers recommend alt text under 125 characters/);
    expect(warning).toHaveClass("opacity-0");

    const longAlt = "a".repeat(130);
    await act(async () => {
      fireEvent.change(altInput, { target: { value: longAlt } });
      await waitFor(() => expect(screen.getByText("130 / 125 chars")).toBeInTheDocument());
    });
    expect(warning).not.toHaveClass("opacity-0");
    expect((altInput as HTMLInputElement).value).toHaveLength(130);
  });
});

describe("Unsaved changes guard (insight)", () => {
  const typeInEditor = () => {
    const editor = screen.getByLabelText("doc-editor");
    fireEvent.change(editor, { target: { value: "Unsaved body" } });
  };

  it("opens modal when navigating away with dirty write step", async () => {
    await renderWriteStep();
    typeInEditor();
    fireEvent.click(screen.getByText("Prev"));
    expect(await screen.findByText("You have unsaved changes in WRITE. Save before leaving?")).toBeInTheDocument();
    // Should stay on write step until resolved.
    expect(screen.getByText(/Step 2 of 4/)).toBeInTheDocument();
  });

  it("leaves without saving when clicking Discard", async () => {
    await renderWriteStep();
    typeInEditor();
    fireEvent.click(screen.getByText("Prev"));
    const discardBtn = await screen.findByText("Discard");
    fireEvent.click(discardBtn);
    await waitFor(() => expect(screen.getByText(/Step 1 of 4/)).toBeInTheDocument());
    // Navigate back to write step to confirm revert.
    fireEvent.click(screen.getByText("Next"));
    await waitFor(() => expect(screen.getByText(/Step 2 of 4/)).toBeInTheDocument());
    expect((screen.getByLabelText("doc-editor") as HTMLTextAreaElement).value).toBe("");
  });

  it("saves then navigates when clicking Save & Continue", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).confirm = vi.fn().mockReturnValue(true);
    const submitSpy = vi.fn().mockResolvedValue({ success: true });
    render(
      <ContentCreationPanel
        mode="insight"
        initialValues={{ title: "Hello", slug: "hello" }}
        onSubmit={submitSpy}
        searchAuthors={async () => []}
        searchCategories={async () => []}
      />,
    );
    await act(async () => {
      fireEvent.click(screen.getByText("Next"));
    });
    await waitFor(() => expect(screen.getByText(/Step 2 of 4/)).toBeInTheDocument());
    const volumeInput = within(screen.getByText("Monthly searches").closest("div") as HTMLElement).getByRole("spinbutton");
    fireEvent.change(volumeInput, { target: { value: "300" } });
    fireEvent.blur(volumeInput);
    typeInEditor();
    fireEvent.click(screen.getByText("Next"));
    const saveBtn = await screen.findByText("Save & Continue");
    await act(async () => {
      fireEvent.click(saveBtn);
    });
    await waitFor(() => expect(submitSpy).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText(/Step 3 of 4/)).toBeInTheDocument());
  });

  it("stays on write step when cancelling modal", async () => {
    await renderWriteStep();
    typeInEditor();
    fireEvent.click(screen.getByText("Prev"));
    const cancelBtn = await screen.findByText("Cancel");
    fireEvent.click(cancelBtn);
    expect(screen.getByText(/Step 2 of 4/)).toBeInTheDocument();
  });

  it("navigates cleanly when state is clean", async () => {
    await renderWriteStep();
    fireEvent.click(screen.getByText("Prev"));
    await waitFor(() => expect(screen.getByText(/Step 1 of 4/)).toBeInTheDocument());
  });
});
