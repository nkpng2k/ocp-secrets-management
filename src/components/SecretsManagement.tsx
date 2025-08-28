import * as React from 'react';
import Helmet from 'react-helmet';
import { useTranslation } from 'react-i18next';
import {
  Title,
  Tabs,
  Tab,
  TabTitleText,
} from '@patternfly/react-core';
import { KeyIcon } from '@patternfly/react-icons';
import { CertificatesTable } from './CertificatesTable';
import { IssuersTable } from './IssuersTable';
import { ExternalSecretsTable } from './ExternalSecretsTable';
import { SecretStoresTable } from './SecretStoresTable';

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
      <div className="co-m-pane__body co-m-pane__body--no-top-margin">
        <div className="co-m-pane__heading">
          <Title headingLevel="h1" size="2xl" className="co-m-pane__heading-title">
            <KeyIcon className="co-m-resource-icon co-m-resource-icon--lg" /> {t('Secrets Management')}
          </Title>
          <p className="help-block">
            {t('Manage certificates, external secrets, and secret stores across your cluster.')}
          </p>
        </div>
        <div className="co-m-pane__body-group">
          <Tabs 
            activeKey={activeTabKey} 
            onSelect={handleTabClick}
            className="co-m-horizontal-nav__menu"
          >
            <Tab
              eventKey={0}
              title={<TabTitleText>{t('Certificates')}</TabTitleText>}
            >
              <div className="co-m-pane__content">
                <CertificatesTable />
              </div>
            </Tab>
            <Tab
              eventKey={1}
              title={<TabTitleText>{t('Issuers')}</TabTitleText>}
            >
              <div className="co-m-pane__content">
                <IssuersTable />
              </div>
            </Tab>
            <Tab
              eventKey={2}
              title={<TabTitleText>{t('External Secrets')}</TabTitleText>}
            >
              <div className="co-m-pane__content">
                <ExternalSecretsTable />
              </div>
            </Tab>
            <Tab
              eventKey={3}
              title={<TabTitleText>{t('Secret Stores')}</TabTitleText>}
            >
              <div className="co-m-pane__content">
                <SecretStoresTable />
              </div>
            </Tab>
          </Tabs>
        </div>
      </div>
    </>
  );
}
