import { useApp } from '../../contexts/AppContext';

export default function Toast() {
  const { toast } = useApp();

  if (!toast.show) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 bg-slate-800 text-white text-sm font-medium rounded-xl shadow-lg shadow-black/20 animate-[fadeInUp_0.3s_ease] whitespace-nowrap">
      {toast.message}
    </div>
  );
}
