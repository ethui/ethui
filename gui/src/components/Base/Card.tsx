interface Props {
  children: React.ReactNode;
}

export function Card({ children }: Props) {
  return (
    <div className="flex flex-col rounded-lg border border-gray-200 bg-white shadow-md">
      <div className="flex h-full flex-col justify-center gap-4 p-6">
        {children}
      </div>
    </div>
  );
}
