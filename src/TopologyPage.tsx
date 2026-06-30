import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { DocumentTitle } from '@openshift-console/dynamic-plugin-sdk';
import {
  Title,
  Button,
  Alert,
  AlertVariant,
  Spinner,
  EmptyState,
  EmptyStateBody,
  EmptyStateActions,
  EmptyStateFooter,
} from '@patternfly/react-core';
import { ArrowLeftIcon } from '@patternfly/react-icons';
import TopologyGraph from './components/topology/TopologyGraph';
import TopologySidebar from './components/topology/TopologySidebar';
import { useCSITopologyData } from './components/topology/hooks/useCSITopologyData';
import { GraphNodeData } from './components/topology/model/types';
import './components/topology/TopologyGraph.css';

function resolveOperator(resourceType: string): string | null {
  switch (resourceType) {
    case 'secretproviderclasses':
    case 'secretproviderclasspodstatuses':
      return 'secrets-store-csi';
    default:
      return null;
  }
}

function buildFocusId(resourceType: string, namespace: string, name: string): string {
  switch (resourceType) {
    case 'secretproviderclasses':
      return `spc:${namespace}/${name}`;
    case 'secretproviderclasspodstatuses':
      return `spcps:${namespace}/${name}`;
    default:
      return '';
  }
}

export function TopologyPage() {
  const { t } = useTranslation('plugin__ocp-secrets-management');

  const pathname = window.location.pathname;
  const pathParts = pathname.split('/');
  const baseIndex = pathParts.findIndex((part) => part === 'topology');
  const resourceType =
    baseIndex >= 0 && pathParts.length > baseIndex + 1 ? pathParts[baseIndex + 1] : '';
  const namespace =
    pathParts.length > baseIndex + 2 ? pathParts[baseIndex + 2] : '';
  const name =
    pathParts.length > baseIndex + 3 ? pathParts[baseIndex + 3] : '';

  const operator = resolveOperator(resourceType);
  const focusId = buildFocusId(resourceType, namespace, name);

  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);

  const handleSelect = React.useCallback((ids: string[]) => {
    setSelectedNodeId(ids.length > 0 ? ids[0] : null);
  }, []);

  const handleBackClick = () => {
    window.history.back();
  };

  if (!operator) {
    return (
      <>
        <DocumentTitle>{t('Topology')}</DocumentTitle>
        <div style={{ padding: 24 }}>
          <Alert variant={AlertVariant.danger} title={t('Unknown resource type')}>
            {t('Resource type "{{resourceType}}" is not supported for topology view.', {
              resourceType,
            })}
          </Alert>
        </div>
      </>
    );
  }

  return (
    <>
      <DocumentTitle>{t('Topology')}</DocumentTitle>
      <div style={{ padding: '16px 24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <Button variant="link" onClick={handleBackClick} style={{ paddingLeft: 0 }}>
            <ArrowLeftIcon /> {t('Back')}
          </Button>
          <Title headingLevel="h1" size="lg">
            {t('Topology')}: {name}
          </Title>
        </div>
      </div>
      <TopologyContent
        namespace={namespace}
        focusId={focusId}
        selectedNodeId={selectedNodeId}
        onSelect={handleSelect}
        onCloseSidebar={() => setSelectedNodeId(null)}
      />
    </>
  );
}

interface TopologyContentProps {
  namespace: string;
  focusId: string;
  selectedNodeId: string | null;
  onSelect: (ids: string[]) => void;
  onCloseSidebar: () => void;
}

function TopologyContent({
  namespace,
  focusId,
  selectedNodeId,
  onSelect,
  onCloseSidebar,
}: TopologyContentProps) {
  const { t } = useTranslation('plugin__ocp-secrets-management');
  const { model, loaded, error } = useCSITopologyData(namespace, focusId);

  const selectedData = React.useMemo<GraphNodeData | null>(() => {
    if (!selectedNodeId || !model.nodes) return null;
    const node = model.nodes.find((n) => n.id === selectedNodeId);
    return (node?.data as GraphNodeData) ?? null;
  }, [selectedNodeId, model.nodes]);

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <Alert variant={AlertVariant.danger} title={t('Error loading resources')}>
          {String(error)}
        </Alert>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spinner size="xl" aria-label={t('Loading')} />
      </div>
    );
  }

  if (!model.nodes || model.nodes.length === 0) {
    return (
      <div className="topology-empty-state">
        <EmptyState>
          <EmptyStateBody>
            {t('No Secrets Store CSI resources found in this namespace.')}
          </EmptyStateBody>
          <EmptyStateFooter>
            <EmptyStateActions>
              <Button variant="link" onClick={() => window.history.back()}>
                {t('Go back')}
              </Button>
            </EmptyStateActions>
          </EmptyStateFooter>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="topology-container">
      <div className="topology-graph-area">
        <TopologyGraph model={model} onSelect={onSelect} />
      </div>
      {selectedData && (
        <TopologySidebar data={selectedData} onClose={onCloseSidebar} />
      )}
    </div>
  );
}

export default TopologyPage;
