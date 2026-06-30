import { ComponentType } from 'react';
import { Model, NodeStatus } from '@patternfly/react-topology';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';

export const GRAPH_ID = 'resource-topology';

export const EDGE_TYPE = 'edge';

export interface GraphNodeData {
  kind: string;
  label: string;
  status?: NodeStatus;
  icon?: ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
  resource?: K8sResourceCommon;
  namespace?: string;
  resourcePath?: string;
  details?: { label: string; value: string }[];
  highlighted?: boolean;
}

export interface TopologyDataResult {
  model: Model;
  loaded: boolean;
  error: Error | null;
}
