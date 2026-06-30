import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Label,
  Title,
} from '@patternfly/react-core';
import { TimesIcon } from '@patternfly/react-icons';
import { NodeStatus } from '@patternfly/react-topology';
import { GraphNodeData } from './model/types';

interface TopologySidebarProps {
  data: GraphNodeData;
  onClose: () => void;
}

function statusColor(status?: NodeStatus): 'green' | 'orange' | 'red' | 'blue' | 'grey' {
  switch (status) {
    case NodeStatus.success:
      return 'green';
    case NodeStatus.warning:
      return 'orange';
    case NodeStatus.danger:
      return 'red';
    case NodeStatus.info:
      return 'blue';
    default:
      return 'grey';
  }
}

function statusLabel(status?: NodeStatus): string {
  switch (status) {
    case NodeStatus.success:
      return 'Ready';
    case NodeStatus.warning:
      return 'Warning';
    case NodeStatus.danger:
      return 'Error';
    case NodeStatus.info:
      return 'Info';
    default:
      return 'Unknown';
  }
}

const TopologySidebar: React.FC<TopologySidebarProps> = ({ data, onClose }) => {
  const { t } = useTranslation('plugin__ocp-secrets-management');

  return (
    <div className="topology-sidebar">
      <div className="topology-sidebar__header">
        <Title headingLevel="h3">{data.label}</Title>
        <Button variant="plain" onClick={onClose} aria-label={t('Close')}>
          <TimesIcon />
        </Button>
      </div>

      <Label color={statusColor(data.status)} style={{ marginBottom: 12 }}>
        {statusLabel(data.status)}
      </Label>

      <DescriptionList className="topology-sidebar__details">
        <DescriptionListGroup>
          <DescriptionListTerm>{t('Kind')}</DescriptionListTerm>
          <DescriptionListDescription>{data.kind}</DescriptionListDescription>
        </DescriptionListGroup>

        {data.namespace && (
          <DescriptionListGroup>
            <DescriptionListTerm>{t('Namespace')}</DescriptionListTerm>
            <DescriptionListDescription>{data.namespace}</DescriptionListDescription>
          </DescriptionListGroup>
        )}

        {data.details?.map((detail) => (
          <DescriptionListGroup key={detail.label}>
            <DescriptionListTerm>{detail.label}</DescriptionListTerm>
            <DescriptionListDescription>{detail.value}</DescriptionListDescription>
          </DescriptionListGroup>
        ))}
      </DescriptionList>

      {data.resourcePath && (
        <div style={{ marginTop: 16 }}>
          <Button
            variant="link"
            component="a"
            href={data.resourcePath}
          >
            {t('Inspect')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default TopologySidebar;
