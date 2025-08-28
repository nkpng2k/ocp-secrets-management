import * as React from 'react';
import Helmet from 'react-helmet';
import { useTranslation } from 'react-i18next';
import {
  Title,
  Card,
  CardBody,
  CardTitle,
  Grid,
  GridItem,
  Badge,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { KeyIcon } from '@patternfly/react-icons';
import { CertificatesTable } from './CertificatesTable';
import { IssuersTable } from './IssuersTable';
import { ExternalSecretsTable } from './ExternalSecretsTable';
import { SecretStoresTable } from './SecretStoresTable';

type OperatorType = 'cert-manager' | 'external-secrets' | 'all';
type ResourceKind = 'certificates' | 'issuers' | 'externalsecrets' | 'secretstores' | 'all';

interface FilterState {
  operator: OperatorType;
  resourceKind: ResourceKind;
}

export default function SecretsManagement() {
  const { t } = useTranslation('plugin__ocp-secrets-management');
  const [filters, setFilters] = React.useState<FilterState>({
    operator: 'all',
    resourceKind: 'all',
  });


  const operatorOptions = [
    { value: 'all', label: t('All Operators'), description: t('Show resources from all operators') },
    { value: 'cert-manager', label: 'cert-manager', description: t('Certificate lifecycle management') },
    { value: 'external-secrets', label: 'External Secrets Operator', description: t('External secret synchronization') },
  ];

  const getResourceOptions = (operator: OperatorType) => {
    const baseOptions = [{ value: 'all', label: t('All Resources'), description: t('Show all resource types') }];
    
    if (operator === 'all') {
      return [
        ...baseOptions,
        { value: 'certificates', label: t('Certificates'), description: t('cert-manager certificates') },
        { value: 'issuers', label: t('Issuers'), description: t('cert-manager issuers') },
        { value: 'externalsecrets', label: t('External Secrets'), description: t('External secret definitions') },
        { value: 'secretstores', label: t('Secret Stores'), description: t('External secret stores') },
      ];
    } else if (operator === 'cert-manager') {
      return [
        ...baseOptions,
        { value: 'certificates', label: t('Certificates'), description: t('TLS certificates') },
        { value: 'issuers', label: t('Issuers'), description: t('Certificate issuers') },
      ];
    } else if (operator === 'external-secrets') {
      return [
        ...baseOptions,
        { value: 'externalsecrets', label: t('External Secrets'), description: t('Secret synchronization rules') },
        { value: 'secretstores', label: t('Secret Stores'), description: t('External secret backends') },
      ];
    }
    return baseOptions;
  };

  const handleOperatorChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newOperator = event.target.value as OperatorType;
    setFilters(prev => ({
      operator: newOperator,
      resourceKind: 'all', // Reset resource filter when operator changes
    }));
  };

  const handleResourceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({
      ...prev,
      resourceKind: event.target.value as ResourceKind,
    }));
  };

  const shouldShowComponent = (operator: OperatorType, resourceKind: ResourceKind) => {
    if (filters.operator !== 'all' && filters.operator !== operator) return false;
    if (filters.resourceKind !== 'all' && filters.resourceKind !== resourceKind) return false;
    return true;
  };

  return (
    <>
      <Helmet>
        <title data-test="secrets-management-page-title">
          {t('Secrets Management')}
        </title>
      </Helmet>
      <div className="co-m-pane__body co-m-pane__body--no-top-margin">
        <div className="co-m-pane__heading">
          <Title headingLevel="h1" size="2xl" className="co-m-pane__heading-title">
            <KeyIcon className="co-m-resource-icon co-m-resource-icon--lg" /> {t('Secrets Management')}
          </Title>
          <p className="help-block">
            {t('Manage certificates, external secrets, and secret stores across your cluster.')}
          </p>
        </div>

        {/* Filter Controls */}
        <div className="co-m-pane__filter-bar" style={{ padding: '16px 0', borderBottom: '1px solid #ddd', marginBottom: '16px' }}>
          <Flex spaceItems={{ default: 'spaceItemsMd' }}>
            <FlexItem>
              <label className="co-m-filter-label" style={{ marginRight: '8px', fontWeight: 'bold' }}>
                {t('Operator')}:
              </label>
              <select 
                className="form-control" 
                value={filters.operator} 
                onChange={handleOperatorChange}
                style={{ width: '200px', display: 'inline-block' }}
              >
                {operatorOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FlexItem>
            <FlexItem>
              <label className="co-m-filter-label" style={{ marginRight: '8px', fontWeight: 'bold' }}>
                {t('Resource Type')}:
              </label>
              <select 
                className="form-control" 
                value={filters.resourceKind} 
                onChange={handleResourceChange}
                style={{ width: '200px', display: 'inline-block' }}
              >
                {getResourceOptions(filters.operator).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FlexItem>
            <FlexItem>
              <Badge isRead>
                {filters.operator === 'all' ? t('All Operators') : 
                 filters.operator === 'cert-manager' ? 'cert-manager' : 'External Secrets'}
                {filters.resourceKind !== 'all' && ` → ${getResourceOptions(filters.operator).find(opt => opt.value === filters.resourceKind)?.label}`}
              </Badge>
            </FlexItem>
          </Flex>
        </div>

        <div className="co-m-pane__body-group">
          <Grid hasGutter>
            {/* cert-manager Resources */}
            {shouldShowComponent('cert-manager', 'certificates') && (
              <GridItem span={12}>
                <Card>
                  <CardTitle>
                    <Flex alignItems={{ default: 'alignItemsCenter' }}>
                      <FlexItem>
                        {t('Certificates')} 
                        <Badge isRead style={{ marginLeft: '8px' }}>cert-manager</Badge>
                      </FlexItem>
                    </Flex>
                  </CardTitle>
                  <CardBody>
                    <CertificatesTable />
                  </CardBody>
                </Card>
              </GridItem>
            )}

            {shouldShowComponent('cert-manager', 'issuers') && (
              <GridItem span={12}>
                <Card>
                  <CardTitle>
                    <Flex alignItems={{ default: 'alignItemsCenter' }}>
                      <FlexItem>
                        {t('Issuers')}
                        <Badge isRead style={{ marginLeft: '8px' }}>cert-manager</Badge>
                      </FlexItem>
                    </Flex>
                  </CardTitle>
                  <CardBody>
                    <IssuersTable />
                  </CardBody>
                </Card>
              </GridItem>
            )}

            {/* External Secrets Resources */}
            {shouldShowComponent('external-secrets', 'externalsecrets') && (
              <GridItem span={12}>
                <Card>
                  <CardTitle>
                    <Flex alignItems={{ default: 'alignItemsCenter' }}>
                      <FlexItem>
                        {t('External Secrets')}
                        <Badge isRead style={{ marginLeft: '8px' }}>External Secrets Operator</Badge>
                      </FlexItem>
                    </Flex>
                  </CardTitle>
                  <CardBody>
                    <ExternalSecretsTable />
                  </CardBody>
                </Card>
              </GridItem>
            )}

            {shouldShowComponent('external-secrets', 'secretstores') && (
              <GridItem span={12}>
                <Card>
                  <CardTitle>
                    <Flex alignItems={{ default: 'alignItemsCenter' }}>
                      <FlexItem>
                        {t('Secret Stores')}
                        <Badge isRead style={{ marginLeft: '8px' }}>External Secrets Operator</Badge>
                      </FlexItem>
                    </Flex>
                  </CardTitle>
                  <CardBody>
                    <SecretStoresTable />
                  </CardBody>
                </Card>
              </GridItem>
            )}
          </Grid>
        </div>
      </div>
    </>
  );
}
