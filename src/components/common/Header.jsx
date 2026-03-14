import { useNavigate } from 'react-router-dom';

export default function Header({
  title,
  showBack = true,
  transparent = false,
  rightActions = null,
  onBack = null
}) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <header
      className={`sticky top-0 z-30 flex items-center justify-between px-4 h-14 ${
        transparent
          ? 'bg-transparent absolute left-0 right-0'
          : 'bg-white/80 backdrop-blur-md border-b border-slate-100'
      }`}
    >
      {showBack ? (
        <button
          onClick={handleBack}
          className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
            transparent
              ? 'bg-white/20 text-white hover:bg-white/30'
              : 'hover:bg-slate-100 text-slate-700'
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">arrow_back</span>
        </button>
      ) : (
        <div className="w-10" />
      )}

      <h1
        className={`text-[17px] font-bold tracking-tight flex-1 text-center ${
          transparent ? 'text-white' : 'text-slate-800'
        }`}
      >
        {title}
      </h1>

      <div className="w-10 flex items-center justify-end">
        {rightActions}
      </div>
    </header>
  );
}
