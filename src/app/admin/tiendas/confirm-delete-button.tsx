"use client";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  message: string;
  label?: string;
};

export function ConfirmDeleteButton({
  action,
  message,
  label = "Eliminar tienda",
}: Props) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
      style={{ marginTop: "1rem" }}
    >
      <button className="btn btn-ghost" type="submit">
        {label}
      </button>
    </form>
  );
}
