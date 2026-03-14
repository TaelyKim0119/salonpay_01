import { useApp } from '../../contexts/AppContext';
import { useI18n } from '../../contexts/I18nContext';

export default function Loading() {
  const { isLoading, loadingMessage } = useApp();
  const { t } = useI18n();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-10 h-10 border-3 border-white/30 border-t-white rounded-full animate-spin" />
      <p className="mt-4 text-white text-sm font-medium">
        {loadingMessage || t('loadingData')}
      </p>
    </div>
  );
}
