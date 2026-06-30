import { Model, NodeModel, EdgeModel, NodeStatus, NodeShape } from '@patternfly/react-topology';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import {
  SecretProviderClass,
  SecretProviderClassPodStatus,
} from '../../crds';
import { GRAPH_ID, EDGE_TYPE, GraphNodeData } from './types';

const NODE_PROVIDER = 'provider';
const NODE_SPC = 'secretProviderClass';
const NODE_SPCPS = 'podStatus';
const NODE_WORKLOAD = 'workload';

export { NODE_PROVIDER, NODE_SPC, NODE_SPCPS, NODE_WORKLOAD };

export interface CSITopologyResources {
  secretProviderClasses: SecretProviderClass[];
  podStatuses: SecretProviderClassPodStatus[];
  pods: K8sResourceCommon[];
  replicaSets: K8sResourceCommon[];
  deployments: K8sResourceCommon[];
}

interface OwnerRef {
  kind: string;
  name: string;
}

function getOwnerRefs(resource: K8sResourceCommon): OwnerRef[] {
  return (resource as { metadata?: { ownerReferences?: OwnerRef[] } }).metadata?.ownerReferences ?? [];
}

function buildPodToWorkloadMap(
  pods: K8sResourceCommon[],
  replicaSets: K8sResourceCommon[],
  deployments: K8sResourceCommon[],
): Map<string, { name: string; kind: string }> {
  const rsToWorkload = new Map<string, { name: string; kind: string }>();

  for (const rs of replicaSets) {
    const rsName = rs.metadata?.name ?? '';
    const owner = getOwnerRefs(rs).find(
      (ref) => ref.kind === 'Deployment' || ref.kind === 'StatefulSet' || ref.kind === 'DaemonSet',
    );
    if (owner) {
      rsToWorkload.set(rsName, { name: owner.name, kind: owner.kind });
    }
  }

  const deploymentNames = new Set(deployments.map((d) => d.metadata?.name).filter(Boolean));

  const podToWorkload = new Map<string, { name: string; kind: string }>();
  for (const pod of pods) {
    const podName = pod.metadata?.name ?? '';
    const owner = getOwnerRefs(pod).find((ref) => ref.kind === 'ReplicaSet');
    if (owner && rsToWorkload.has(owner.name)) {
      const workload = rsToWorkload.get(owner.name)!;
      if (deploymentNames.has(workload.name) || workload.kind !== 'Deployment') {
        podToWorkload.set(podName, workload);
      }
    } else {
      const directOwner = getOwnerRefs(pod).find(
        (ref) => ref.kind === 'DaemonSet' || ref.kind === 'StatefulSet',
      );
      if (directOwner) {
        podToWorkload.set(podName, { name: directOwner.name, kind: directOwner.kind });
      }
    }
  }

  return podToWorkload;
}

export function buildCSIGraphModel(
  resources: CSITopologyResources,
  focusResourceId?: string,
): Model {
  const nodes: NodeModel[] = [];
  const edges: EdgeModel[] = [];
  const providerSeen = new Set<string>();
  const workloadSeen = new Set<string>();

  const podToWorkload = buildPodToWorkloadMap(
    resources.pods,
    resources.replicaSets,
    resources.deployments,
  );

  const spcPodStatuses = new Map<string, SecretProviderClassPodStatus[]>();
  for (const ps of resources.podStatuses) {
    const spcName = ps.status?.secretProviderClassName;
    if (!spcName) continue;
    const key = `${ps.metadata.namespace}/${spcName}`;
    if (!spcPodStatuses.has(key)) spcPodStatuses.set(key, []);
    spcPodStatuses.get(key)!.push(ps);
  }

  for (const spc of resources.secretProviderClasses) {
    const provider = spc.spec?.provider || 'unknown';
    const ns = spc.metadata.namespace;
    const spcName = spc.metadata.name;
    const spcId = `spc:${ns}/${spcName}`;
    const providerId = `provider:${provider}`;

    if (!providerSeen.has(provider)) {
      providerSeen.add(provider);
      const providerData: GraphNodeData = {
        kind: 'Provider',
        label: provider,
        status: NodeStatus.default,
        badge: provider,
        details: [{ label: 'Provider', value: provider }],
        highlighted: providerId === focusResourceId,
      };
      nodes.push({
        id: providerId,
        type: NODE_PROVIDER,
        label: provider,
        width: 75,
        height: 75,
        shape: NodeShape.stadium,
        status: NodeStatus.default,
        data: providerData,
      });
    }

    const relatedPodStatuses = spcPodStatuses.get(`${ns}/${spcName}`) ?? [];
    const hasMounted = relatedPodStatuses.some((ps) => ps.status?.mounted);
    const spcStatus =
      relatedPodStatuses.length === 0
        ? NodeStatus.default
        : hasMounted
          ? NodeStatus.success
          : NodeStatus.warning;

    const spcData: GraphNodeData = {
      kind: 'SecretProviderClass',
      label: spcName,
      status: spcStatus,
      namespace: ns,
      resource: spc as unknown as K8sResourceCommon,
      resourcePath: `/secrets-management/inspect/secretproviderclasses/${ns}/${spcName}`,
      details: [
        { label: 'Provider', value: provider },
        { label: 'Secret Objects', value: String(spc.spec?.secretObjects?.length ?? 0) },
        { label: 'Pod Statuses', value: String(relatedPodStatuses.length) },
      ],
      highlighted: spcId === focusResourceId,
    };
    nodes.push({
      id: spcId,
      type: NODE_SPC,
      label: spcName,
      width: 75,
      height: 75,
      shape: NodeShape.rect,
      status: spcStatus,
      data: spcData,
    });

    edges.push({
      id: `${providerId}->${spcId}`,
      type: EDGE_TYPE,
      source: providerId,
      target: spcId,
    });

    for (const ps of relatedPodStatuses) {
      const psId = `spcps:${ps.metadata.namespace}/${ps.metadata.name}`;
      const mounted = ps.status?.mounted ?? false;
      const podName = ps.status?.podName ?? ps.metadata.name;

      const psData: GraphNodeData = {
        kind: 'SecretProviderClassPodStatus',
        label: podName,
        status: mounted ? NodeStatus.success : NodeStatus.danger,
        namespace: ps.metadata.namespace,
        resource: ps as unknown as K8sResourceCommon,
        details: [
          { label: 'Pod', value: podName },
          { label: 'Mounted', value: mounted ? 'Yes' : 'No' },
          { label: 'Target Path', value: ps.status?.targetPath ?? 'N/A' },
        ],
        highlighted: psId === focusResourceId,
      };
      nodes.push({
        id: psId,
        type: NODE_SPCPS,
        label: podName,
        width: 75,
        height: 75,
        shape: NodeShape.ellipse,
        status: mounted ? NodeStatus.success : NodeStatus.danger,
        data: psData,
      });

      edges.push({
        id: `${spcId}->${psId}`,
        type: EDGE_TYPE,
        source: spcId,
        target: psId,
      });

      const workload = podToWorkload.get(podName);
      if (workload) {
        const workloadId = `workload:${ns}/${workload.name}`;
        if (!workloadSeen.has(workloadId)) {
          workloadSeen.add(workloadId);
          const matchingDeployment = resources.deployments.find(
            (d) => d.metadata?.name === workload.name && d.metadata?.namespace === ns,
          );
          const workloadData: GraphNodeData = {
            kind: workload.kind,
            label: workload.name,
            status: NodeStatus.default,
            badge: workload.kind,
            namespace: ns,
            resource: matchingDeployment,
            details: [
              { label: 'Name', value: workload.name },
              { label: 'Kind', value: workload.kind },
              { label: 'Namespace', value: ns },
            ],
            highlighted: workloadId === focusResourceId,
          };
          nodes.push({
            id: workloadId,
            type: NODE_WORKLOAD,
            label: workload.name,
            width: 75,
            height: 75,
            shape: NodeShape.hexagon,
            status: NodeStatus.default,
            data: workloadData,
          });
        }

        edges.push({
          id: `${psId}->${workloadId}`,
          type: EDGE_TYPE,
          source: psId,
          target: `workload:${ns}/${workload.name}`,
        });
      }
    }
  }

  return {
    nodes,
    edges,
    graph: {
      id: GRAPH_ID,
      type: 'graph',
      layout: 'Dagre',
    },
  };
}
