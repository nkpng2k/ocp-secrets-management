import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import {
  SecretProviderClassModel,
  SecretProviderClassPodStatusModel,
  SecretProviderClass,
  SecretProviderClassPodStatus,
} from '../../crds';
import { buildCSIGraphModel, CSITopologyResources } from '../model/buildCSIGraphModel';
import { TopologyDataResult } from '../model/types';

const PodModel = { group: '', version: 'v1', kind: 'Pod' };
const ReplicaSetModel = { group: 'apps', version: 'v1', kind: 'ReplicaSet' };
const DeploymentModel = { group: 'apps', version: 'v1', kind: 'Deployment' };

export function useCSITopologyData(
  namespace?: string,
  focusResourceId?: string,
): TopologyDataResult {
  const nsOption = namespace || undefined;

  const [spcs, spcsLoaded, spcsError] = useK8sWatchResource<SecretProviderClass[]>({
    groupVersionKind: SecretProviderClassModel,
    namespace: nsOption,
    isList: true,
  });

  const [podStatuses, psLoaded, psError] = useK8sWatchResource<SecretProviderClassPodStatus[]>({
    groupVersionKind: SecretProviderClassPodStatusModel,
    namespace: nsOption,
    isList: true,
  });

  const [pods, podsLoaded, podsError] = useK8sWatchResource<K8sResourceCommon[]>({
    groupVersionKind: PodModel,
    namespace: nsOption,
    isList: true,
  });

  const [replicaSets, rsLoaded, rsError] = useK8sWatchResource<K8sResourceCommon[]>({
    groupVersionKind: ReplicaSetModel,
    namespace: nsOption,
    isList: true,
  });

  const [deployments, depsLoaded, depsError] = useK8sWatchResource<K8sResourceCommon[]>({
    groupVersionKind: DeploymentModel,
    namespace: nsOption,
    isList: true,
  });

  const loaded = spcsLoaded && psLoaded && podsLoaded && rsLoaded && depsLoaded;
  const error = spcsError || psError || podsError || rsError || depsError || null;

  const resources: CSITopologyResources = {
    secretProviderClasses: spcs ?? [],
    podStatuses: podStatuses ?? [],
    pods: pods ?? [],
    replicaSets: replicaSets ?? [],
    deployments: deployments ?? [],
  };

  const model = buildCSIGraphModel(resources, focusResourceId);

  return { model, loaded, error: error as Error | null };
}
