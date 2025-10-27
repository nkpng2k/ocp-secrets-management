import * as React from 'react';
import { useTranslation } from 'react-i18next';
import Helmet from 'react-helmet';
import {
  Title,
  Card,
  CardTitle,
  CardBody,
  Grid,
  GridItem,
  Button,
  Label,
  DescriptionList,
  DescriptionListTerm,
  DescriptionListDescription,
  DescriptionListGroup,
  Alert,
  AlertVariant,
  Switch,
} from '@patternfly/react-core';
import { ArrowLeftIcon, KeyIcon, CheckCircleIcon, TimesCircleIcon } from '@patternfly/react-icons';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';

// Resource models
const CertificateModel = {
  group: 'cert-manager.io',
  version: 'v1',
  kind: 'Certificate',
};

const IssuerModel = {
  group: 'cert-manager.io',
  version: 'v1',
  kind: 'Issuer',
};

const ClusterIssuerModel = {
  group: 'cert-manager.io',
  version: 'v1',
  kind: 'ClusterIssuer',
};

const ExternalSecretModel = {
  group: 'external-secrets.io',
  version: 'v1beta1',
  kind: 'ExternalSecret',
};

const SecretStoreModel = {
  group: 'external-secrets.io',
  version: 'v1beta1',
  kind: 'SecretStore',
};

const ClusterSecretStoreModel = {
  group: 'external-secrets.io',
  version: 'v1beta1',
  kind: 'ClusterSecretStore',
};

const SecretProviderClassModel = {
  group: 'secrets-store.csi.x-k8s.io',
  version: 'v1',
  kind: 'SecretProviderClass',
};

const SecretProviderClassPodStatusModel = {
  group: 'secrets-store.csi.x-k8s.io',
  version: 'v1',
  kind: 'SecretProviderClassPodStatus',
};

const PushSecretModel = {
  group: 'external-secrets.io',
  version: 'v1alpha1',
  kind: 'PushSecret',
};

interface SecretProviderClassPodStatus {
  metadata: {
    name: string;
    namespace: string;
    creationTimestamp: string;
  };
  status: {
    mounted: boolean;
    secretProviderClassName: string;
    podName?: string;
    targetPath?: string;
  };
}

export const ResourceInspect: React.FC = () => {
  const { t } = useTranslation('plugin__ocp-secrets-management');
  
  // State for revealing sensitive data (separate for spec and status)
  const [showSpecSensitiveData, setShowSpecSensitiveData] = React.useState(false);
  const [showStatusSensitiveData, setShowStatusSensitiveData] = React.useState(false);
  
  // Parse URL manually since useParams() isn't working in plugin environment
  const pathname = window.location.pathname;
  const pathParts = pathname.split('/');
  
  // Expected format: /secrets-management/inspect/{resourceType}/{namespace}/{name}
  // or: /secrets-management/inspect/{resourceType}/{name} (for cluster-scoped)
  const baseIndex = pathParts.findIndex(part => part === 'inspect');
  const resourceType = baseIndex >= 0 && pathParts.length > baseIndex + 1 ? pathParts[baseIndex + 1] : '';
  
  let namespace: string | undefined;
  let name: string;
  
  if (pathParts.length > baseIndex + 3) {
    // Format: /secrets-management/inspect/{resourceType}/{namespace}/{name}
    namespace = pathParts[baseIndex + 2];
    name = pathParts[baseIndex + 3];
  } else {
    // Format: /secrets-management/inspect/{resourceType}/{name} (cluster-scoped)
    name = pathParts[baseIndex + 2] || '';
  }



  const handleBackClick = () => {
    window.history.back();
  };

  // Determine the correct model based on resource type
  const getResourceModel = () => {
    switch (resourceType) {
      case 'certificates':
        return CertificateModel;
      case 'issuers':
        return IssuerModel;
      case 'clusterissuers':
        return ClusterIssuerModel;
      case 'externalsecrets':
        return ExternalSecretModel;
      case 'secretstores':
        return SecretStoreModel;
      case 'clustersecretstores':
        return ClusterSecretStoreModel;
      case 'pushsecrets':
        return PushSecretModel;
      case 'secretproviderclasses':
        return SecretProviderClassModel;
      default:
        return null;
    }
  };

  const model = getResourceModel();
  const isClusterScoped = resourceType === 'clusterissuers' || resourceType === 'clustersecretstores';

  const [resource, loaded, loadError] = useK8sWatchResource<any>({
    groupVersionKind: model,
    name: name,
    namespace: isClusterScoped ? undefined : (namespace || 'demo'),
    isList: false,
  });

  // Watch SecretProviderClassPodStatus resources when inspecting a SecretProviderClass
  const [podStatuses, podStatusesLoaded, podStatusesError] = useK8sWatchResource<SecretProviderClassPodStatus[]>({
    groupVersionKind: SecretProviderClassPodStatusModel,
    namespace: resourceType === 'secretproviderclasses' ? (namespace || 'demo') : undefined,
    isList: true,
  });

  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return '-';
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  const renderMetadata = () => {
    if (!resource?.metadata) return null;

    return (
      <Card>
        <CardTitle>{t('Metadata')}</CardTitle>
        <CardBody>
          <DescriptionList isHorizontal>
            <DescriptionListGroup>
              <DescriptionListTerm>{t('Name')}</DescriptionListTerm>
              <DescriptionListDescription>{resource.metadata.name || '-'}</DescriptionListDescription>
            </DescriptionListGroup>
            {resource.metadata.namespace && (
              <DescriptionListGroup>
                <DescriptionListTerm>{t('Namespace')}</DescriptionListTerm>
                <DescriptionListDescription>{resource.metadata.namespace}</DescriptionListDescription>
              </DescriptionListGroup>
            )}
            <DescriptionListGroup>
              <DescriptionListTerm>{t('Creation timestamp')}</DescriptionListTerm>
              <DescriptionListDescription>
                {formatTimestamp(resource.metadata.creationTimestamp)}
              </DescriptionListDescription>
            </DescriptionListGroup>
            {resource.metadata.uid && (
              <DescriptionListGroup>
                <DescriptionListTerm>{t('UID')}</DescriptionListTerm>
                <DescriptionListDescription>{resource.metadata.uid}</DescriptionListDescription>
              </DescriptionListGroup>
            )}
            {resource.metadata.resourceVersion && (
              <DescriptionListGroup>
                <DescriptionListTerm>{t('Resource version')}</DescriptionListTerm>
                <DescriptionListDescription>{resource.metadata.resourceVersion}</DescriptionListDescription>
              </DescriptionListGroup>
            )}
          </DescriptionList>
        </CardBody>
      </Card>
    );
  };

  const renderLabels = () => {
    const labels = resource?.metadata?.labels;
    if (!labels || Object.keys(labels).length === 0) {
      return (
        <Card>
          <CardTitle>{t('Labels')}</CardTitle>
          <CardBody>
            <em>{t('No labels')}</em>
          </CardBody>
        </Card>
      );
    }

    return (
      <Card>
        <CardTitle>{t('Labels')}</CardTitle>
        <CardBody>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {Object.entries(labels).map(([key, value]) => (
              <Label key={key} color="blue">
                {key}: {value}
              </Label>
            ))}
          </div>
        </CardBody>
      </Card>
    );
  };

  const renderAnnotations = () => {
    const annotations = resource?.metadata?.annotations;
    if (!annotations || Object.keys(annotations).length === 0) {
      return (
        <Card>
          <CardTitle>{t('Annotations')}</CardTitle>
          <CardBody>
            <em>{t('No annotations')}</em>
          </CardBody>
        </Card>
      );
    }

    return (
      <Card>
        <CardTitle>{t('Annotations')}</CardTitle>
        <CardBody>
          <DescriptionList isHorizontal>
            {Object.entries(annotations).map(([key, value]) => (
              <DescriptionListGroup key={key}>
                <DescriptionListTerm>{key}</DescriptionListTerm>
                <DescriptionListDescription style={{ wordBreak: 'break-all' }}>
                  {value}
                </DescriptionListDescription>
              </DescriptionListGroup>
            ))}
          </DescriptionList>
        </CardBody>
      </Card>
    );
  };

  // Function to check if object contains sensitive data
  const containsSensitiveData = (obj: any): boolean => {
    const sensitiveKeys = [
      'password', 'secret', 'token', 'key', 'privateKey', 'secretKey',
      'accessKey', 'secretAccessKey', 'clientSecret', 'apiKey', 'auth',
      'authentication', 'credential', 'cert', 'certificate', 'tls',
      // SecretProviderClass specific sensitive patterns
      'tenantId', 'clientId', 'subscriptionId', 'resourceGroup', 'vaultName',
      'keyVaultName', 'servicePrincipal', 'roleArn', 'region', 'vaultUrl',
      'vaultAddress', 'vaultNamespace', 'vaultRole', 'vaultPath', 'parameters'
    ];
    
    const checkObject = (data: any): boolean => {
      if (Array.isArray(data)) {
        return data.some(checkObject);
      }
      
      if (data && typeof data === 'object') {
        for (const [key, value] of Object.entries(data)) {
          const lowerKey = key.toLowerCase();
          const isSensitive = sensitiveKeys.some(sensitiveKey => 
            lowerKey.includes(sensitiveKey.toLowerCase())
          );
          
          if (isSensitive || checkObject(value)) {
            return true;
          }
        }
      }
      
      return false;
    };
    
    return checkObject(obj);
  };

  const renderSpecification = () => {
    if (!resource?.spec) return null;

    const hasSensitiveData = containsSensitiveData(resource.spec);
    const shouldHideContent = hasSensitiveData && !showSpecSensitiveData;

    return (
      <Card>
        <CardTitle>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {t('Specification')}
            {hasSensitiveData && (
              <Switch
                id="spec-sensitive-toggle"
                label={showSpecSensitiveData ? t('Hide sensitive data') : t('Show sensitive data')}
                isChecked={!showSpecSensitiveData}
                onChange={(event, checked) => setShowSpecSensitiveData(!checked)}
                ouiaId="SpecificationSensitiveToggle"
              />
            )}
          </div>
        </CardTitle>
        <CardBody>
          <pre style={{ 
            padding: '16px', 
            borderRadius: '4px',
            overflow: 'auto',
            fontSize: '12px',
            maxHeight: '400px',
            border: '1px solid #d2d2d2'
          }}>
            {shouldHideContent ? '...' : JSON.stringify(resource.spec, null, 2)}
          </pre>
        </CardBody>
      </Card>
    );
  };

  const renderStatus = () => {
    if (!resource?.status) return null;

    const hasSensitiveData = containsSensitiveData(resource.status);
    const shouldHideContent = hasSensitiveData && !showStatusSensitiveData;

    return (
      <Card>
        <CardTitle>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {t('Status')}
            {hasSensitiveData && (
              <Switch
                id="status-sensitive-toggle"
                label={showStatusSensitiveData ? t('Hide sensitive data') : t('Show sensitive data')}
                isChecked={!showStatusSensitiveData}
                onChange={(event, checked) => setShowStatusSensitiveData(!checked)}
                ouiaId="StatusSensitiveToggle"
              />
            )}
          </div>
        </CardTitle>
        <CardBody>
          <pre style={{ 
            padding: '16px', 
            borderRadius: '4px',
            overflow: 'auto',
            fontSize: '12px',
            maxHeight: '400px',
            border: '1px solid #d2d2d2'
          }}>
            {shouldHideContent ? '...' : JSON.stringify(resource.status, null, 2)}
          </pre>
        </CardBody>
      </Card>
    );
  };

  const renderSecretProviderClassPodStatuses = () => {
    if (resourceType !== 'secretproviderclasses' || !resource) return null;

    // Filter pod statuses that reference this SecretProviderClass
    const relevantPodStatuses = (podStatuses || []).filter(
      podStatus => podStatus.status.secretProviderClassName === resource.metadata.name
    );

    if (relevantPodStatuses.length === 0) {
      return (
        <Card>
          <CardTitle>{t('Pod Statuses')}</CardTitle>
          <CardBody>
            <p>{t('No pods are currently using this SecretProviderClass.')}</p>
          </CardBody>
        </Card>
      );
    }

    return (
      <Card>
        <CardTitle>{t('Pod Statuses')} ({relevantPodStatuses.length})</CardTitle>
        <CardBody>
          <div style={{ overflowX: 'auto' }}>
            <table className="pf-c-table pf-m-compact pf-m-grid-md" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>{t('Pod Name')}</th>
                  <th>{t('Mounted')}</th>
                  <th>{t('Created')}</th>
                </tr>
              </thead>
              <tbody>
                {relevantPodStatuses.map((podStatus) => (
                  <tr key={podStatus.metadata.name}>
                    <td>{podStatus.status.podName || podStatus.metadata.name}</td>
                    <td>
                      <Label 
                        color={podStatus.status.mounted ? 'green' : 'red'} 
                        icon={podStatus.status.mounted ? <CheckCircleIcon /> : <TimesCircleIcon />}
                      >
                        {podStatus.status.mounted ? t('Yes') : t('No')}
                      </Label>
                    </td>
                    <td>{formatTimestamp(podStatus.metadata.creationTimestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    );
  };

  const getResourceTypeDisplayName = () => {
    switch (resourceType) {
      case 'certificates':
        return t('Certificate');
      case 'issuers':
        return t('Issuer');
      case 'clusterissuers':
        return t('ClusterIssuer');
      case 'externalsecrets':
        return t('ExternalSecret');
      case 'secretstores':
        return t('SecretStore');
      case 'clustersecretstores':
        return t('ClusterSecretStore');
      default:
        return t('Resource');
    }
  };

  if (!model) {
    return (
      <div className="co-m-pane__body">
        <Alert variant={AlertVariant.danger} title={t('Invalid resource type')} isInline>
          {t('The resource type "{resourceType}" is not supported.', { resourceType })}
        </Alert>
      </div>
    );
  }

  // For SecretProviderClass, also wait for pod statuses to load
  const allLoaded = resourceType === 'secretproviderclasses' ? loaded && podStatusesLoaded : loaded;
  
  if (!allLoaded) {
    return (
      <div className="co-m-loader co-an-fade-in-out">
        <div className="co-m-loader-dot__one"></div>
        <div className="co-m-loader-dot__two"></div>
        <div className="co-m-loader-dot__three"></div>
      </div>
    );
  }

  // Handle errors from both resource and pod status loading
  const anyError = loadError || (resourceType === 'secretproviderclasses' ? podStatusesError : null);
  
  if (anyError) {
    return (
      <div className="co-m-pane__body">
        <Alert 
          variant={AlertVariant.danger} 
          title={t('Error loading resource')} 
          isInline
        >
          {anyError.message}
        </Alert>
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="co-m-pane__body">
        <Alert 
          variant={AlertVariant.warning} 
          title={t('Resource not found')} 
          isInline
        >
          {t('The {resourceType} "{name}" was not found.', { 
            resourceType: getResourceTypeDisplayName(), 
            name 
          })}
        </Alert>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{t('{resourceType} details', { resourceType: getResourceTypeDisplayName() })}</title>
      </Helmet>
      
      <div className="co-m-pane__body">
        <div className="co-m-pane__heading">
          <div className="co-m-pane__name co-resource-item">
            <Button
              variant="plain"
              onClick={handleBackClick}
              style={{ marginRight: '16px' }}
            >
              <ArrowLeftIcon />
            </Button>
            <KeyIcon className="co-m-resource-icon" style={{ marginRight: '8px' }} />
            <Title headingLevel="h1" size="2xl">
              {getResourceTypeDisplayName()}: {name}
            </Title>
          </div>
        </div>

        <Grid hasGutter>
          <GridItem span={12}>
            {renderMetadata()}
          </GridItem>
          <GridItem span={6}>
            {renderLabels()}
          </GridItem>
          <GridItem span={6}>
            {renderAnnotations()}
          </GridItem>
          <GridItem span={6}>
            {renderSpecification()}
          </GridItem>
          <GridItem span={6}>
            {renderStatus()}
          </GridItem>
          {resourceType === 'secretproviderclasses' && (
            <GridItem span={12}>
              {renderSecretProviderClassPodStatuses()}
            </GridItem>
          )}
        </Grid>
      </div>
    </>
  );
};
