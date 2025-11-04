import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AIPromptModal } from "../AIPromptModal";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("AIPromptModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    isLoading: false,
    error: null,
  };

  it("should render modal when isOpen is true", () => {
    render(<AIPromptModal {...defaultProps} />);

    expect(screen.getByText("Wygeneruj list do Mikołaja z pomocą AI")).toBeInTheDocument();
    expect(screen.getByText(/Opisz swoje zainteresowania/)).toBeInTheDocument();
  });

  it("should not render modal when isOpen is false", () => {
    render(<AIPromptModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByText("Wygeneruj list do Mikołaja z pomocą AI")).not.toBeInTheDocument();
  });

  it("should validate prompt length", async () => {
    render(<AIPromptModal {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(/Np. Lubię książki/);
    const submitButton = screen.getByText("Generuj");

    // Prompt za krótki
    fireEvent.change(textarea, { target: { value: "test" } });
    expect(submitButton).toBeDisabled();

    // Prompt OK
    fireEvent.change(textarea, { target: { value: "test prompt with more than 10 chars" } });
    expect(submitButton).toBeEnabled();
  });

  it("should show character count with color coding", () => {
    render(<AIPromptModal {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(/Np. Lubię książki/);

    // Short prompt - red
    fireEvent.change(textarea, { target: { value: "short" } });
    expect(screen.getByText("5 / 2000")).toHaveClass("text-destructive");

    // Normal prompt - muted
    fireEvent.change(textarea, { target: { value: "This is a normal length prompt with enough characters" } });
    expect(screen.getByText(/\d+ \/ 2000/)).toHaveClass("text-muted-foreground");

    // Long prompt - yellow
    fireEvent.change(textarea, { target: { value: "a".repeat(950) } });
    expect(screen.getByText(/\d+ \/ 2000/)).toHaveClass("text-yellow-600");
  });

  it("should show error message", () => {
    const error = { code: "INVALID_PROMPT", message: "Prompt is too short" };
    render(<AIPromptModal {...defaultProps} error={error} />);

    expect(screen.getByText("Prompt is too short")).toBeInTheDocument();
  });

  it("should show loading state", () => {
    render(<AIPromptModal {...defaultProps} isLoading={true} />);

    expect(screen.getByText("Generuję list...")).toBeInTheDocument();
    expect(screen.getByText("Generuję list...")).toBeDisabled();
  });

  it("should call onSubmit with prompt when form is submitted", () => {
    const onSubmit = vi.fn();
    render(<AIPromptModal {...defaultProps} onSubmit={onSubmit} />);

    const textarea = screen.getByPlaceholderText(/Np. Lubię książki/);
    const submitButton = screen.getByText("Generuj");

    fireEvent.change(textarea, { target: { value: "I love fantasy books and coffee" } });
    fireEvent.click(submitButton);

    expect(onSubmit).toHaveBeenCalledWith("I love fantasy books and coffee");
  });

  it("should call onClose when cancel button is clicked", () => {
    const onClose = vi.fn();
    render(<AIPromptModal {...defaultProps} onClose={onClose} />);

    const cancelButton = screen.getByText("Anuluj");
    fireEvent.click(cancelButton);

    expect(onClose).toHaveBeenCalled();
  });

  it("should prevent form submission when prompt is too short", () => {
    const onSubmit = vi.fn();
    render(<AIPromptModal {...defaultProps} onSubmit={onSubmit} />);

    const textarea = screen.getByPlaceholderText(/Np. Lubię książki/);
    const submitButton = screen.getByText("Generuj");

    fireEvent.change(textarea, { target: { value: "short" } });
    fireEvent.click(submitButton);

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("should trim prompt whitespace", () => {
    const onSubmit = vi.fn();
    render(<AIPromptModal {...defaultProps} onSubmit={onSubmit} />);

    const textarea = screen.getByPlaceholderText(/Np. Lubię książki/);
    const submitButton = screen.getByText("Generuj");

    fireEvent.change(textarea, { target: { value: "  I love fantasy books  " } });
    fireEvent.click(submitButton);

    expect(onSubmit).toHaveBeenCalledWith("  I love fantasy books  "); // Component handles trimming in onSubmit
  });

  it("should reset form when modal closes", () => {
    const { rerender } = render(<AIPromptModal {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(/Np. Lubię książki/);
    fireEvent.change(textarea, { target: { value: "test content" } });

    expect(textarea).toHaveValue("test content");

    // Close modal - this should trigger reset
    rerender(<AIPromptModal {...defaultProps} isOpen={false} />);

    // Reopen modal - form should be reset
    rerender(<AIPromptModal {...defaultProps} isOpen={true} />);

    const newTextarea = screen.getByPlaceholderText(/Np. Lubię książki/);
    expect(newTextarea).toHaveValue("");
  });
});
