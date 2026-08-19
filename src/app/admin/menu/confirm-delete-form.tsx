"use client";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  message: string;
  children: React.ReactNode;
};

export function ConfirmDeleteForm({ action, message, children }: Props) {
  return (
    <form
      action={action}
      style={{ display: "inline" }}
      onSubmit={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </form>
  );
}
