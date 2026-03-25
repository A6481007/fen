import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import PDFViewer from "../PDFViewer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useEffect } from "react";
import { axe } from "vitest-axe";

vi.mock("react-pdf", () => {
  return {
    Document: ({ children, onLoadSuccess, onLoadError, file }: any) => {
      useEffect(() => {
        if (file === "error") {
          onLoadError?.(new Error("failed"));
        } else {
          onLoadSuccess?.({ numPages: 2 });
        }
      }, [file, onLoadSuccess, onLoadError]);

      if (file === "error") {
        return <div data-testid="pdf-error">Error loading</div>;
      }

      return <div data-testid="pdf-document">{children}</div>;
    },
    Page: ({ pageNumber }: any) => <div data-testid={`page-${pageNumber}`}>Page {pageNumber}</div>,
    pdfjs: { GlobalWorkerOptions: { workerSrc: "" } },
  };
});

const realFetch = global.fetch;

afterEach(() => {
  vi.restoreAllMocks();
  global.fetch = realFetch;
});

describe("PDFViewer", () => {
  it("renders fallback card when no fileUrl is provided", () => {
    const { container } = render(<PDFViewer />);
    expect(screen.getByText("No PDF file available for preview.")).toBeInTheDocument();
    return axe(container).then((results) => expect(results.violations).toHaveLength(0));
  });

  it("shows controls and page count once the document loads", async () => {
    const blob = new Blob(["pdf"]);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => blob,
    } as Response);
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:sample");

    render(<PDFViewer fileUrl="https://example.com/sample.pdf" title="Sample PDF" />);

    expect(screen.getByRole("button", { name: /Zoom in/i })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/Page 1 of 2/)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /Download/i })).not.toBeDisabled();
  });

  it("surfaces load fallback content when preview fails", async () => {
    render(<PDFViewer fileUrl="error" title="Broken" />);

    await waitFor(() =>
      expect(
        screen.getByText(/We could not load the preview. Please use the download button instead./i)
      ).toBeInTheDocument()
    );
  });

  it("shows prefetch failure notice when fetch rejects", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network error"));

    render(<PDFViewer fileUrl="https://example.com/offline.pdf" title="Offline PDF" />);

    await waitFor(() =>
      expect(
        screen.getByText(/Preview is loading from the source directly because caching failed./i)
      ).toBeInTheDocument()
    );
  });

  it("displays download error messaging when download fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:sample");

    render(<PDFViewer fileUrl="https://example.com/fail.pdf" title="Failing PDF" />);

    fireEvent.click(screen.getByRole("button", { name: /Download/i }));

    await waitFor(() =>
      expect(
        screen.getByText(/Download failed\. Try "Open in browser" or check your connection./i)
      ).toBeInTheDocument()
    );
  });
});
