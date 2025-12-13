import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { ControleLavouraList } from '@/components/controle-lavoura/ControleLavouraList';
import { ControleLavouraForm } from '@/components/controle-lavoura/ControleLavouraForm';
import { ControleLavouraDetalhe } from '@/components/controle-lavoura/ControleLavouraDetalhe';
import { useControleLavoura } from '@/hooks/useControleLavouras';
import { useAuth } from '@/contexts/AuthContext';
import { Spinner } from '@/components/ui/spinner';

type ViewMode = 'list' | 'create' | 'edit';

export default function ControleLavoura() {
  const { canEdit } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: selectedControle, isLoading: loadingControle } = useControleLavoura(selectedId);

  const handleNew = () => {
    setSelectedId(null);
    setViewMode('create');
  };

  const handleEdit = (id: string) => {
    setSelectedId(id);
    setViewMode('edit');
  };

  const handleBack = () => {
    setSelectedId(null);
    setViewMode('list');
  };

  const handleSaved = (id: string) => {
    setSelectedId(id);
    setViewMode('edit');
  };

  const renderContent = () => {
    if (viewMode === 'list') {
      return (
        <ControleLavouraList
          onNew={handleNew}
          onEdit={handleEdit}
          canEdit={canEdit}
        />
      );
    }

    if (viewMode === 'create') {
      return (
        <ControleLavouraForm
          mode="create"
          onBack={handleBack}
          onSaved={handleSaved}
        />
      );
    }

    if (viewMode === 'edit') {
      if (loadingControle) {
        return (
          <div className="flex items-center justify-center h-64">
            <Spinner className="h-8 w-8" />
          </div>
        );
      }

      if (!selectedControle) {
        return (
          <div className="text-center text-muted-foreground py-8">
            Registro não encontrado.
          </div>
        );
      }

      return (
        <ControleLavouraDetalhe
          controleLavoura={selectedControle}
          onBack={handleBack}
          canEdit={canEdit}
        />
      );
    }

    return null;
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <PageHeader
          title="Controle de Lavoura"
          description="Gerencie plantios, aplicações e colheitas por safra e lavoura"
        />
        {renderContent()}
      </div>
    </AppLayout>
  );
}
