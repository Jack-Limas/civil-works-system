interface Column<T> {
  header: string;
  accessor: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  isLoading?: boolean;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  emptyMessage?: string;
}

export function DataTable<T>({ columns, rows, rowKey, isLoading, onEdit, onDelete, emptyMessage }: DataTableProps<T>) {
  if (isLoading) return <p className="py-8 text-center text-sm text-gray-500">Cargando...</p>;
  if (rows.length === 0)
    return <p className="py-8 text-center text-sm text-gray-500">{emptyMessage ?? "Sin registros"}</p>;

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            {columns.map((col) => (
              <th key={col.header} className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                {col.header}
              </th>
            ))}
            {(onEdit || onDelete) && <th className="px-4 py-2 text-right">Acciones</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {rows.map((row) => (
            <tr key={rowKey(row)} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
              {columns.map((col) => (
                <td key={col.header} className="px-4 py-2">{col.accessor(row)}</td>
              ))}
              {(onEdit || onDelete) && (
                <td className="px-4 py-2 text-right">
                  {onEdit && (
                    <button onClick={() => onEdit(row)} className="mr-2 text-indigo-600 hover:underline">
                      Editar
                    </button>
                  )}
                  {onDelete && (
                    <button onClick={() => onDelete(row)} className="text-red-500 hover:underline">
                      Eliminar
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}