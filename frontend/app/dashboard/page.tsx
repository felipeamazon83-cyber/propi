'use client';

import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

type EmployeeTipSummary = {
  employee_id: string;
  employee_name: string;
  total_amount: number;
  tip_count: number;
  last_tip_at?: string;
};

export default function DashboardTipsPage() {
  const [tipsSummary, setTipsSummary] = useState<EmployeeTipSummary[]>([]);
  const [totalAccumulated, setTotalAccumulated] = useState(0);
  const [loading, setLoading] = useState(true);

  async function loadTips() {
    try {
      // Endpoint para obtener el acumulado por empleado
      const data = await api<EmployeeTipSummary[]>('/tips/summary-by-employee', {}, true);
      setTipsSummary(data);
      const grandTotal = data.reduce((acc, curr) => acc + curr.total_amount, 0);
      setTotalAccumulated(grandTotal);
    } catch {
      // Mock de datos para vista previa si aún no tienes propinas reales
      setTipsSummary([
        { employee_id: '1', employee_name: 'Carlos Mendoza', total_amount: 45.5, tip_count: 8 },
        { employee_id: '2', employee_name: 'Ana Rodríguez', total_amount: 82.0, tip_count: 14 },
      ]);
      setTotalAccumulated(127.5);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTips();
  }, []);

  if (loading) return <div>Cargando propinas...</div>;

  return (
    <div className="max-w-5xl">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">Panel de Propinas</h1>
          <p className="text-gray-600">Resumen acumulado para liquidación de equipo.</p>
        </div>
        <button className="btn btn-secondary" onClick={() => void loadTips()}>
          🔄 Actualizar
        </button>
      </header>

      {/* KPIs Rápidos */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total Acumulado</p>
          <p className="mt-2 text-3xl font-black text-green-600">{totalAccumulated.toFixed(2)} €</p>
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Empleados Activos</p>
          <p className="mt-2 text-3xl font-black text-gray-800">{tipsSummary.length}</p>
        </div>
      </div>

      {/* Tabla por Empleado */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">Reparto por Empleado</h2>
        </div>
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-xs uppercase text-gray-400">
            <tr>
              <th className="px-6 py-3">Empleado</th>
              <th className="px-6 py-3">Nº Propinas</th>
              <th className="px-6 py-3">Total Acumulado</th>
              <th className="px-6 py-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tipsSummary.map((item) => (
              <tr key={item.employee_id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-bold text-gray-900">{item.employee_name}</td>
                <td className="px-6 py-4">{item.tip_count} pagos</td>
                <td className="px-6 py-4 font-black text-green-600">{item.total_amount.toFixed(2)} €</td>
                <td className="px-6 py-4 text-right">
                  <button className="btn btn-secondary text-xs">Ver detalle</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
