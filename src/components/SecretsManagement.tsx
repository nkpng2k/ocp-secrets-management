import * as React from 'react';
import Helmet from 'react-helmet';
import { useTranslation } from 'react-i18next';
import {
  Page,
  PageSection,
  Title,
  Tabs,
  Tab,
  TabTitleText,
  Card,
  CardBody,
} from '@patternfly/react-core';
import { KeyIcon } from '@patternfly/react-icons';
import { IssuersTable } from './IssuersTable';
import { SecretStoresTable } from './SecretStoresTable';
import { ExternalSecretsTable } from './ExternalSecretsTable';
import { CertificatesTable } from './CertificatesTable';

export default function SecretsManagement() {
  const { t } = useTranslation('plugin__ocp-secrets-management');
  const [activeTabKey, setActiveTabKey] = React.useState<string | number>(0);

  const handleTabClick = (
    event: React.MouseEvent<any> | React.KeyboardEvent | MouseEvent,
    tabIndex: string | number,
  ) => {
    setActiveTabKey(tabIndex);
  };

  return (
    <>
      <Helmet>
        <title data-test="secrets-management-page-title">
          {t('Secrets Management')}
        </title>
      </Helmet>
      <Page>
        <PageSection variant="default">
          <Title headingLevel="h1" size="2xl">
            <KeyIcon /> {t('Secrets Management')}
          </Title>
          <p>{t('Manage certificates, external secrets, and secret stores across your cluster.')}</p>
        </PageSection>
        <PageSection>
          <Card>
            <CardBody>
              <Tabs activeKey={activeTabKey} onSelect={handleTabClick}>
                <Tab
                  eventKey={0}
                  title={<TabTitleText>{t('Certificates')}</TabTitleText>}
                >
                  <CertificatesTable />
                </Tab>
                <Tab
                  eventKey={1}
                  title={<TabTitleText>{t('Issuers')}</TabTitleText>}
                >
                  <IssuersTable />
                </Tab>
                <Tab
                  eventKey={2}
                  title={<TabTitleText>{t('External Secrets')}</TabTitleText>}
                >
                  <ExternalSecretsTable />
                </Tab>
                <Tab
                  eventKey={3}
                  title={<TabTitleText>{t('Secret Stores')}</TabTitleText>}
                >
                  <SecretStoresTable />
                </Tab>
              </Tabs>
            </CardBody>
          </Card>
        </PageSection>
      </Page>
    </>
  );
}
